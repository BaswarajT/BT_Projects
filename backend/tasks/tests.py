from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project, ProjectMember
from users.models import User


class TaskAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pm", password="StrongPassword123")
        self.client.force_authenticate(self.user)
        self.project = Project.objects.create(name="Demo", code="DEMO1", owner=self.user)
        ProjectMember.objects.create(project=self.project, user=self.user)

    def test_create_and_update_task_status(self):
        create = self.client.post(
            "/api/tasks/",
            {"project": self.project.id, "title": "Design schema", "priority": "HIGH"},
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        task_id = create.data["id"]

        update = self.client.patch(f"/api/tasks/{task_id}/", {"status": "IN_PROGRESS"}, format="json")
        self.assertEqual(update.status_code, status.HTTP_200_OK)
        self.assertEqual(update.data["status"], "IN_PROGRESS")

    def test_non_member_cannot_see_task(self):
        outsider = User.objects.create_user(username="outsider", password="StrongPassword123")
        self.client.post(
            "/api/tasks/", {"project": self.project.id, "title": "Secret task"}, format="json"
        )
        self.client.force_authenticate(outsider)
        response = self.client.get("/api/tasks/")
        self.assertEqual(len(response.data), 0)
