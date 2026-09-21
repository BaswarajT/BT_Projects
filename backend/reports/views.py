from django.db.models import Count
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Milestone, Project
from tasks.models import Task
from users.permissions import has_company_wide_visibility, is_global_admin


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        if is_global_admin(user):
            projects = Project.objects.all()
            tasks = Task.objects.all()
            milestone_scope = Milestone.objects.all()
        elif has_company_wide_visibility(user):
            projects = Project.objects.filter(company=user.company)
            tasks = Task.objects.filter(project__company=user.company)
            milestone_scope = Milestone.objects.filter(project__company=user.company)
        else:
            projects = Project.objects.filter(members__user=user).distinct()
            tasks = Task.objects.filter(project__members__user=user).distinct()
            milestone_scope = Milestone.objects.filter(project__members__user=user)

        milestones = (
            milestone_scope.filter(is_completed=False, due_date__gte=today)
            .select_related("project")
            .distinct()
            .order_by("due_date")[:5]
        )

        project_progress = []
        for project in projects.order_by("-updated_at")[:8]:
            project_tasks = Task.objects.filter(project=project)
            total = project_tasks.count()
            done = project_tasks.filter(status="DONE").count()
            project_progress.append({
                "id": project.id,
                "name": project.name,
                "code": project.code,
                "status": project.status,
                "total_tasks": total,
                "completed_tasks": done,
                "percent_complete": round((done / total) * 100) if total else 0,
            })

        workload_rows = (
            tasks.exclude(status="DONE")
            .exclude(assigned_to__isnull=True)
            .values("assigned_to", "assigned_to__username")
            .annotate(open_task_count=Count("id"))
            .order_by("-open_task_count")[:8]
        )
        team_workload = [
            {
                "id": row["assigned_to"],
                "username": row["assigned_to__username"],
                "open_task_count": row["open_task_count"],
            }
            for row in workload_rows
        ]

        data = {
            "total_projects": projects.count(),
            "open_tasks": tasks.exclude(status="DONE").count(),
            "completed_tasks": tasks.filter(status="DONE").count(),
            "overdue_tasks": tasks.exclude(status="DONE").filter(due_date__lt=today).count(),
            "blocked_tasks": tasks.filter(status="BLOCKED").count(),
            "upcoming_milestones": [
                {
                    "id": m.id,
                    "title": m.title,
                    "due_date": m.due_date,
                    "project_name": m.project.name,
                }
                for m in milestones
            ],
            "project_progress": project_progress,
            "team_workload": list(team_workload),
        }
        return Response(data)
