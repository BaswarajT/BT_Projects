from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from users.models import User

from .models import Project


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
            {"name": "Test Project", "description": "Testing"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["owner_name"], "testuser")
        self.assertEqual(response.data["company"], self.company.id)

    def test_list_only_shows_own_projects(self):
        other = User.objects.create_user(
            username="other", password="StrongPassword123", company=self.company
        )
        self.client.post("/api/projects/", {"name": "Mine"}, format="json")

        self.client.force_authenticate(other)
        response = self.client.get("/api/projects/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_regular_member_can_edit_full_pmo_field_set_on_own_project(self):
        # Confirms the "everyone, company-scoped" policy: a plain MEMBER (not an
        # admin-tier role) can both create a project and edit the PMO-dashboard
        # fields on it, as long as it's within their own company and they own it.
        created = self.client.post("/api/projects/", {"name": "My Project"}, format="json")
        project_id = created.data["id"]

        response = self.client.patch(
            f"/api/projects/{project_id}/",
            {
                "region": "APAC", "project_group": "GRC - KSA", "status": "ACTIVE",
                "percent_complete": 30, "project_type": "MRA",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["region"], "APAC")
        self.assertEqual(response.data["project_group"], "GRC - KSA")
        self.assertEqual(response.data["status"], "ACTIVE")
        self.assertEqual(response.data["percent_complete"], 30)


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
        resp = self.client.post("/api/projects/", {"name": "Company A Secret"}, format="json")
        self.project_a_id = resp.data["id"]

        self.client.force_authenticate(self.member_b)
        self.client.post("/api/projects/", {"name": "Company B Secret"}, format="json")

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
                "name": "SCA MRA Engagement",
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
            {"name": "KSA Deal", "pmo": self.pmo_user.id, "project_group": "GRC - KSA"},
            format="json",
        )
        self.client.post(
            "/api/projects/",
            {"name": "India Deal", "project_group": "MDR - India"},
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
            "/api/projects/", {"name": "Early", "start_date": "2026-01-01"}, format="json"
        )
        self.client.post(
            "/api/projects/", {"name": "Late", "start_date": "2026-12-01"}, format="json"
        )

        response = self.client.get("/api/projects/?start_date_from=2026-06-01")
        names = [p["name"] for p in response.data]
        self.assertEqual(names, ["Late"])

    def test_export_csv(self):
        self.client.post("/api/projects/", {"name": "Exportable"}, format="json")
        response = self.client.get("/api/projects/export/?filetype=csv")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        body = response.content.decode("utf-8")
        self.assertIn("Project Id", body)
        self.assertIn("Exportable", body)

    def test_export_default_format_is_csv(self):
        self.client.post("/api/projects/", {"name": "Exportable"}, format="json")
        response = self.client.get("/api/projects/export/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")

    def test_export_xlsx(self):
        self.client.post("/api/projects/", {"name": "Exportable"}, format="json")
        response = self.client.get("/api/projects/export/?filetype=xlsx")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    def test_export_rejects_unknown_format(self):
        response = self.client.get("/api/projects/export/?filetype=pdf")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProjectCodeGenerationTest(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A", code="CODEA")
        self.company_b = Company.objects.create(name="Company B", code="CODEB")
        self.user_a = User.objects.create_user(
            username="user_a", password="StrongPassword123", company=self.company_a
        )
        self.user_b = User.objects.create_user(
            username="user_b", password="StrongPassword123", company=self.company_b
        )

    def test_first_project_gets_pr_1001(self):
        self.client.force_authenticate(self.user_a)
        response = self.client.post("/api/projects/", {"name": "First"}, format="json")
        self.assertEqual(response.data["code"], "PR-1001")

    def test_sequence_increments_within_a_company(self):
        self.client.force_authenticate(self.user_a)
        self.client.post("/api/projects/", {"name": "First"}, format="json")
        second = self.client.post("/api/projects/", {"name": "Second"}, format="json")
        self.assertEqual(second.data["code"], "PR-1002")

    def test_two_companies_each_start_at_pr_1001_independently(self):
        self.client.force_authenticate(self.user_a)
        resp_a = self.client.post("/api/projects/", {"name": "A's first"}, format="json")

        self.client.force_authenticate(self.user_b)
        resp_b = self.client.post("/api/projects/", {"name": "B's first"}, format="json")

        self.assertEqual(resp_a.data["code"], "PR-1001")
        self.assertEqual(resp_b.data["code"], "PR-1001")

    def test_client_supplied_code_is_ignored(self):
        self.client.force_authenticate(self.user_a)
        response = self.client.post(
            "/api/projects/", {"name": "Sneaky", "code": "HACKED-1"}, format="json"
        )
        self.assertEqual(response.data["code"], "PR-1001")

    def test_sequence_continues_past_legacy_codes(self):
        Project.objects.create(name="Legacy", code="PR-1234", owner=self.user_a, company=self.company_a)
        self.client.force_authenticate(self.user_a)
        response = self.client.post("/api/projects/", {"name": "Next"}, format="json")
        self.assertEqual(response.data["code"], "PR-1235")


class ProjectRecycleBinTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="RECYCLE1")
        self.admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )
        self.client.force_authenticate(self.admin)
        created = self.client.post("/api/projects/", {"name": "Doomed Project"}, format="json")
        self.project_id = created.data["id"]

    def test_delete_soft_deletes_not_hard_deletes(self):
        response = self.client.delete(f"/api/projects/{self.project_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        project = Project.objects.get(id=self.project_id)
        self.assertIsNotNone(project.deleted_at)

    def test_deleted_project_disappears_from_list_but_appears_in_recycle_bin(self):
        self.client.delete(f"/api/projects/{self.project_id}/")

        active = self.client.get("/api/projects/")
        self.assertNotIn("Doomed Project", [p["name"] for p in active.data])

        bin_response = self.client.get("/api/projects/recycle-bin/")
        self.assertEqual(bin_response.status_code, status.HTTP_200_OK)
        self.assertIn("Doomed Project", [p["name"] for p in bin_response.data])

    def test_restore_returns_project_to_active_list(self):
        self.client.delete(f"/api/projects/{self.project_id}/")
        response = self.client.post(f"/api/projects/{self.project_id}/restore/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        active = self.client.get("/api/projects/")
        self.assertIn("Doomed Project", [p["name"] for p in active.data])

    def test_deleted_project_excluded_from_dashboard_and_overrun_report(self):
        self.client.delete(f"/api/projects/{self.project_id}/")

        dashboard = self.client.get("/api/dashboard/summary/")
        self.assertEqual(dashboard.data["total_projects"], 0)

        overrun = self.client.get("/api/reports/project-overrun/")
        self.assertEqual(overrun.data["projects"], [])
