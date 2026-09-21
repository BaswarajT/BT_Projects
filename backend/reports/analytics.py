from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum

ACTIVE_TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"]


def count_weekdays(start_date, end_date):
    """Number of Mon-Fri days in [start_date, end_date], inclusive."""
    if end_date < start_date:
        return 0
    days = (end_date - start_date).days + 1
    full_weeks, remainder = divmod(days, 7)
    weekdays = full_weeks * 5
    for i in range(remainder):
        if (start_date + timedelta(days=full_weeks * 7 + i)).weekday() < 5:
            weekdays += 1
    return weekdays


def utilization_status(pct, has_active_assignments):
    if pct <= 0 and not has_active_assignments:
        return "BENCH"
    if pct < 50:
        return "UNDER_UTILIZED"
    if pct <= 100:
        return "UTILIZED"
    return "OVER_ALLOCATED"


def build_resource_utilization(users, tasks_queryset, time_entries_queryset, start_date, end_date):
    """users: iterable of User. tasks_queryset/time_entries_queryset: already scoped to the
    relevant company/platform. Returns a list of per-resource utilization dicts."""
    weekdays = count_weekdays(start_date, end_date)

    logged_by_user = {
        row["user"]: row["total"]
        for row in (
            time_entries_queryset.filter(date__gte=start_date, date__lte=end_date)
            .values("user")
            .annotate(total=Sum("hours"))
        )
    }

    active_tasks_by_user = {}
    latest_due_by_user = {}
    for task in tasks_queryset.filter(
        assigned_to__isnull=False, status__in=ACTIVE_TASK_STATUSES
    ).values("assigned_to", "due_date"):
        uid = task["assigned_to"]
        active_tasks_by_user[uid] = active_tasks_by_user.get(uid, 0) + 1
        due = task["due_date"]
        if due and (uid not in latest_due_by_user or due > latest_due_by_user[uid]):
            latest_due_by_user[uid] = due

    results = []
    for user in users:
        capacity_hours = (Decimal(weekdays) / Decimal(5)) * (user.weekly_capacity_hours or Decimal(0))
        logged_hours = logged_by_user.get(user.id, Decimal(0))
        utilization_pct = float(round((logged_hours / capacity_hours) * 100, 1)) if capacity_hours > 0 else 0.0
        active_count = active_tasks_by_user.get(user.id, 0)
        results.append({
            "id": user.id,
            "username": user.username,
            "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "company_name": user.company.name if user.company else None,
            "weekly_capacity_hours": float(user.weekly_capacity_hours),
            "capacity_hours": float(round(capacity_hours, 1)),
            "logged_hours": float(logged_hours),
            "utilization_pct": utilization_pct,
            "status": utilization_status(utilization_pct, active_count > 0),
            "active_assignments": active_count,
            "available_from": latest_due_by_user.get(user.id),
        })

    results.sort(key=lambda r: r["utilization_pct"], reverse=True)
    return results


def build_project_overrun(projects_queryset, today):
    results = []
    for project in projects_queryset:
        tasks = project.tasks.all()
        estimated = tasks.aggregate(total=Sum("estimated_hours"))["total"] or Decimal(0)
        actual = (
            tasks.aggregate(total=Sum("time_entries__hours"))["total"] or Decimal(0)
        )
        overrun_pct = float(round(((actual - estimated) / estimated) * 100, 1)) if estimated > 0 else 0.0

        is_overdue = bool(
            project.end_date and project.end_date < today and project.status not in ("COMPLETED", "CANCELLED")
        )
        if project.status in ("COMPLETED", "CANCELLED"):
            schedule_status = project.status
        elif is_overdue:
            schedule_status = "OVERDUE"
        elif actual > estimated and estimated > 0:
            schedule_status = "OVER_BUDGET"
        else:
            schedule_status = "ON_TRACK"

        results.append({
            "id": project.id,
            "name": project.name,
            "code": project.code,
            "status": project.status,
            "company_name": project.company.name if project.company else None,
            "estimated_hours": float(estimated),
            "actual_hours": float(actual),
            "overrun_pct": overrun_pct,
            "end_date": project.end_date,
            "is_overdue": is_overdue,
            "schedule_status": schedule_status,
        })

    results.sort(key=lambda r: r["overrun_pct"], reverse=True)
    return results
