from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from users.models import User


class ProjectAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme Inc", code="ACME")
        self.user = User.objects.create_user(
            username="testuser", password="StrongPassword123", company=self.company
        )
        self.client.force_authenticate(self.user)

    def test_create_project(self):
        response = self.client.post(
            "/api/projects/",
            {"name": "Test Project", "code": "TEST01", "description": "Testing"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["owner_name"], "testuser")
        self.assertEqual(response.data["company"], self.company.id)

    def test_list_only_shows_own_projects(self):
        other = User.objects.create_user(
            username="other", password="StrongPassword123", company=self.company
        )
        self.client.post("/api/projects/", {"name": "Mine", "code": "MINE1"}, format="json")

        self.client.force_authenticate(other)
        response = self.client.get("/api/projects/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class CrossCompanyIsolationTest(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A", code="COA")
        self.company_b = Company.objects.create(name="Company B", code="COB")

        self.member_a = User.objects.create_user(
            username="member_a", password="StrongPassword123", company=self.company_a
        )
        self.admin_a = User.objects.create_user(
            username="admin_a", password="StrongPassword123", company=self.company_a, role="ADMIN"
        )
        self.member_b = User.objects.create_user(
            username="member_b", password="StrongPassword123", company=self.company_b
        )
        self.super_admin = User.objects.create_user(
            username="root", password="StrongPassword123", role="SUPER_ADMIN"
        )

        self.client.force_authenticate(self.member_a)
        resp = self.client.post(
            "/api/projects/", {"name": "Company A Secret", "code": "SECRETA"}, format="json"
        )
        self.project_a_id = resp.data["id"]

        self.client.force_authenticate(self.member_b)
        self.client.post("/api/projects/", {"name": "Company B Secret", "code": "SECRETB"}, format="json")

    def test_member_cannot_see_other_companys_projects(self):
        self.client.force_authenticate(self.member_b)
        response = self.client.get("/api/projects/")
        names = [p["name"] for p in response.data]
        self.assertNotIn("Company A Secret", names)
        self.assertIn("Company B Secret", names)

    def test_member_cannot_fetch_other_companys_project_by_id(self):
        self.client.force_authenticate(self.member_b)
        response = self.client.get(f"/api/projects/{self.project_a_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_company_admin_sees_all_projects_in_own_company_only(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/projects/")
        names = [p["name"] for p in response.data]
        self.assertIn("Company A Secret", names)
        self.assertNotIn("Company B Secret", names)

    def test_super_admin_sees_everything(self):
        self.client.force_authenticate(self.super_admin)
        response = self.client.get("/api/projects/")
        names = [p["name"] for p in response.data]
        self.assertIn("Company A Secret", names)
        self.assertIn("Company B Secret", names)
