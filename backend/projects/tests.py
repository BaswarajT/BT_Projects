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
        self.super_admin_a = User.objects.create_user(
            username="super_admin_a", password="StrongPassword123", company=self.company_a, role="SUPER_ADMIN"
        )
        self.member_b = User.objects.create_user(
            username="member_b", password="StrongPassword123", company=self.company_b
        )
        self.global_admin = User.objects.create_user(
            username="root", password="StrongPassword123", role="GLOBAL_ADMIN"
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

    def test_admin_sees_all_projects_in_own_company_only(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/projects/")
        names = [p["name"] for p in response.data]
        self.assertIn("Company A Secret", names)
        self.assertNotIn("Company B Secret", names)

    def test_super_admin_sees_all_projects_in_own_company_only(self):
        self.client.force_authenticate(self.super_admin_a)
        response = self.client.get("/api/projects/")
        names = [p["name"] for p in response.data]
        self.assertIn("Company A Secret", names)
        self.assertNotIn("Company B Secret", names)

    def test_global_admin_sees_everything(self):
        self.client.force_authenticate(self.global_admin)
        response = self.client.get("/api/projects/")
        names = [p["name"] for p in response.data]
        self.assertIn("Company A Secret", names)
        self.assertIn("Company B Secret", names)


class ProjectExtendedFieldsTest(APITestCase):
    """Covers the PMO-dashboard field set (PO tracking, LOB, sales person, etc.),
    its filters, and CSV/XLSX export."""

    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="PMODASH1")
        self.pmo_user = User.objects.create_user(
            username="pmo_lead", password="StrongPassword123", company=self.company, role="ADMIN"
        )
        self.owner = User.objects.create_user(
            username="owner", password="StrongPassword123", company=self.company
        )
        self.client.force_authenticate(self.owner)

    def test_create_with_extended_fields(self):
        response = self.client.post(
            "/api/projects/",
            {
                "name": "SCA MRA Engagement", "code": "PR-9001",
                "percent_complete": 45, "pmo": self.pmo_user.id, "project_group": "GRC - KSA",
                "currency": "SAR", "po_value": "216000.00", "man_days": 300,
                "project_type": "MRA", "completion_status": "ACTIVE",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["percent_complete"], 45)
        self.assertEqual(response.data["pmo_owner_name"], "pmo_lead")
        self.assertEqual(response.data["created_by_name"], "owner")
        self.assertEqual(float(response.data["po_value"]), 216000.0)

    def test_filter_by_pmo_and_lob(self):
        self.client.post(
            "/api/projects/",
            {"name": "KSA Deal", "code": "PR-9002", "pmo": self.pmo_user.id, "project_group": "GRC - KSA"},
            format="json",
        )
        self.client.post(
            "/api/projects/",
            {"name": "India Deal", "code": "PR-9003", "project_group": "MDR - India"},
            format="json",
        )

        response = self.client.get(f"/api/projects/?pmo={self.pmo_user.id}")
        names = [p["name"] for p in response.data]
        self.assertEqual(names, ["KSA Deal"])

        response = self.client.get("/api/projects/?lob=GRC")
        names = [p["name"] for p in response.data]
        self.assertEqual(names, ["KSA Deal"])

    def test_filter_by_date_range(self):
        self.client.post(
            "/api/projects/",
            {"name": "Early", "code": "PR-9004", "start_date": "2026-01-01"},
            format="json",
        )
        self.client.post(
            "/api/projects/",
            {"name": "Late", "code": "PR-9005", "start_date": "2026-12-01"},
            format="json",
        )

        response = self.client.get("/api/projects/?start_date_from=2026-06-01")
        names = [p["name"] for p in response.data]
        self.assertEqual(names, ["Late"])

    def test_export_csv(self):
        self.client.post("/api/projects/", {"name": "Exportable", "code": "PR-9006"}, format="json")
        response = self.client.get("/api/projects/export/?filetype=csv")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        body = response.content.decode("utf-8")
        self.assertIn("Project Id", body)
        self.assertIn("PR-9006", body)

    def test_export_default_format_is_csv(self):
        self.client.post("/api/projects/", {"name": "Exportable", "code": "PR-9008"}, format="json")
        response = self.client.get("/api/projects/export/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")

    def test_export_xlsx(self):
        self.client.post("/api/projects/", {"name": "Exportable", "code": "PR-9007"}, format="json")
        response = self.client.get("/api/projects/export/?filetype=xlsx")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    def test_export_rejects_unknown_format(self):
        response = self.client.get("/api/projects/export/?filetype=pdf")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
