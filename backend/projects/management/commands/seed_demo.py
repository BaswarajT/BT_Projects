from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from projects.models import Milestone, Project, ProjectMember
from tasks.models import Task

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with demo projects, tasks and milestones for local development."

    def handle(self, *args, **options):
        owner, _ = User.objects.get_or_create(
            username="admin", defaults={"email": "admin@example.com", "role": "PROJECT_MANAGER"}
        )
        teammates = []
        for username in ["priya.singh", "marcus.lee", "dana.osei"]:
            user, _ = User.objects.get_or_create(
                username=username, defaults={"email": f"{username}@example.com", "role": "MEMBER"}
            )
            teammates.append(user)

        today = date.today()

        projects_data = [
            ("E-Commerce Analytics", "ECOM01", "ACTIVE", 40, 34),
            ("Mobile App Revamp", "MOBAPP2", "ACTIVE", 28, 12),
            ("Vendor Portal Migration", "VENDOR3", "ON_HOLD", 22, 5),
            ("Q4 Marketing Site", "MKTQ4", "PLANNING", 9, 0),
        ]

        for name, code, status, total, done in projects_data:
            project, created = Project.objects.get_or_create(
                code=code, defaults={"name": name, "owner": owner, "status": status}
            )
            if not created:
                continue
            ProjectMember.objects.get_or_create(project=project, user=owner)
            for teammate in teammates:
                ProjectMember.objects.get_or_create(project=project, user=teammate)

            Milestone.objects.create(
                project=project,
                title=f"{name} milestone",
                due_date=today + timedelta(days=14),
            )

            for i in range(total):
                is_done = i < done
                assignee = teammates[i % len(teammates)]
                Task.objects.create(
                    project=project,
                    title=f"{name} task #{i + 1}",
                    created_by=owner,
                    assigned_to=assignee,
                    status="DONE" if is_done else ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"][i % 4],
                    priority=["LOW", "MEDIUM", "HIGH", "CRITICAL"][i % 4],
                    due_date=today + timedelta(days=(i % 10) - 3),
                )

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
