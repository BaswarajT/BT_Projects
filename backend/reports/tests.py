from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Milestone, Project, ProjectMember
from tasks.models import Task
from users.models import User


class DashboardSummaryTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="lead", password="StrongPassword123")
        self.client.force_authenticate(self.user)
        self.project = Project.objects.create(name="Demo", code="DEMO1", owner=self.user)
        ProjectMember.objects.create(project=self.project, user=self.user)
        Task.objects.create(project=self.project, title="Done task", created_by=self.user,
                             assigned_to=self.user, status="DONE")
        Task.objects.create(project=self.project, title="Open task", created_by=self.user,
                             assigned_to=self.user, status="TODO")
        Milestone.objects.create(project=self.project, title="Beta release", due_date="2026-12-01")

    def test_summary_shape(self):
        response = self.client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_projects"], 1)
        self.assertEqual(response.data["open_tasks"], 1)
        self.assertEqual(response.data["completed_tasks"], 1)
        self.assertEqual(len(response.data["project_progress"]), 1)
        self.assertEqual(response.data["project_progress"][0]["percent_complete"], 50)
        self.assertEqual(len(response.data["upcoming_milestones"]), 1)
        self.assertEqual(len(response.data["team_workload"]), 1)
        self.assertEqual(response.data["team_workload"][0]["open_task_count"], 1)
