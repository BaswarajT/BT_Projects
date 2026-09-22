from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from companies.models import Company
from projects.models import Project
from users.models import User

from .models import SalesProject


class SalesProjectAccessTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="SALES1")
        self.super_admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )
        self.sales_manager = User.objects.create_user(
            username="sales_mgr", password="StrongPassword123", company=self.company, role="SALES_MANAGER"
        )
        self.salesperson = User.objects.create_user(
            username="sales_a", password="StrongPassword123", company=self.company, role="SALESPERSON"
        )
        self.other_salesperson = User.objects.create_user(
            username="sales_b", password="StrongPassword123", company=self.company, role="SALESPERSON"
        )
        self.member = User.objects.create_user(
            username="regular_member", password="StrongPassword123", company=self.company, role="MEMBER"
        )
        self.client_record = Client.objects.create(company=self.company, name="Big Client")

        self.deal_a = SalesProject.objects.create(
            company=self.company, name="Deal A", client=self.client_record,
            salesperson=self.salesperson, stage="NEW", amount=100000, probability=20,
        )
        self.deal_b = SalesProject.objects.create(
            company=self.company, name="Deal B", client=self.client_record,
            salesperson=self.other_salesperson, stage="NEW", amount=200000, probability=20,
        )

    def test_regular_member_forbidden(self):
        self.client.force_authenticate(self.member)
        response = self.client.get("/api/sales-projects/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_sees_only_own_deals(self):
        self.client.force_authenticate(self.salesperson)
        response = self.client.get("/api/sales-projects/")
        names = [d["name"] for d in response.data]
        self.assertIn("Deal A", names)
        self.assertNotIn("Deal B", names)

    def test_sales_manager_sees_all_deals(self):
        self.client.force_authenticate(self.sales_manager)
        response = self.client.get("/api/sales-projects/")
        names = [d["name"] for d in response.data]
        self.assertIn("Deal A", names)
        self.assertIn("Deal B", names)

    def test_weighted_amount_calculated(self):
        self.client.force_authenticate(self.sales_manager)
        response = self.client.get(f"/api/sales-projects/{self.deal_a.id}/")
        self.assertEqual(response.data["weighted_amount"], 20000.0)

    def test_probability_auto_set_on_won(self):
        self.client.force_authenticate(self.salesperson)
        response = self.client.patch(
            f"/api/sales-projects/{self.deal_a.id}/", {"stage": "WON"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["probability"], 100)


class ConvertToProjectTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="SALES2")
        self.sales_manager = User.objects.create_user(
            username="sales_mgr", password="StrongPassword123", company=self.company, role="SALES_MANAGER"
        )
        self.salesperson = User.objects.create_user(
            username="sales_a", password="StrongPassword123", company=self.company, role="SALESPERSON"
        )
        self.client_record = Client.objects.create(company=self.company, name="Big Client")
        self.deal = SalesProject.objects.create(
            company=self.company, name="Won Deal", client=self.client_record,
            salesperson=self.salesperson, stage="WON", amount=500000, probability=100,
            expected_start_date="2026-10-01", expected_end_date="2027-01-01",
        )
        self.client.force_authenticate(self.sales_manager)

    def test_convert_creates_linked_project(self):
        response = self.client.post(f"/api/sales-projects/{self.deal.id}/convert-to-project/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["linked_project"])

        project = Project.objects.get(id=response.data["linked_project"])
        self.assertEqual(project.name, "Won Deal")
        self.assertEqual(project.client_id, self.client_record.id)
        self.assertEqual(project.company_id, self.company.id)
        self.assertEqual(float(project.budget), 500000.0)

    def test_cannot_convert_twice(self):
        self.client.post(f"/api/sales-projects/{self.deal.id}/convert-to-project/")
        response = self.client.post(f"/api/sales-projects/{self.deal.id}/convert-to-project/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_convert_open_deal(self):
        self.deal.stage = "NEW"
        self.deal.save(update_fields=["stage"])
        response = self.client.post(f"/api/sales-projects/{self.deal.id}/convert-to-project/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_project_code_rejected(self):
        Project.objects.create(
            name="Existing", code="DUPCODE", owner=self.salesperson, company=self.company
        )
        response = self.client.post(
            f"/api/sales-projects/{self.deal.id}/convert-to-project/", {"code": "DUPCODE"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SalesProjectCompanyAssignmentTest(APITestCase):
    """Regression test: creating a deal without an explicit `company` used to fail
    for every user with {"company": ["This field is required."]}, since the FK is
    required at the DB level but was never auto-filled server-side."""

    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="SALES3")
        self.other_company = Company.objects.create(name="Globex", code="SALES4")
        self.global_admin = User.objects.create_user(
            username="root_sales", password="StrongPassword123", role="GLOBAL_ADMIN"
        )
        self.salesperson = User.objects.create_user(
            username="sales_c", password="StrongPassword123", company=self.company, role="SALESPERSON"
        )
        self.client_record = Client.objects.create(company=self.company, name="Big Client")
        self.other_client = Client.objects.create(company=self.other_company, name="Other Client")

    def _payload(self, **overrides):
        payload = {
            "name": "New Deal", "client": self.client_record.id, "salesperson": self.salesperson.id,
        }
        payload.update(overrides)
        return payload

    def test_non_global_admin_gets_own_company_without_specifying_it(self):
        self.client.force_authenticate(self.salesperson)
        response = self.client.post("/api/sales-projects/", self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["company"], self.company.id)

    def test_non_global_admin_cannot_assign_a_different_company(self):
        self.client.force_authenticate(self.salesperson)
        response = self.client.post(
            "/api/sales-projects/", self._payload(company=self.other_company.id), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", response.data)

    def test_global_admin_must_specify_company(self):
        self.client.force_authenticate(self.global_admin)
        response = self.client.post("/api/sales-projects/", self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", response.data)

    def test_global_admin_can_specify_company(self):
        self.client.force_authenticate(self.global_admin)
        response = self.client.post(
            "/api/sales-projects/",
            self._payload(company=self.other_company.id, client=self.other_client.id),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["company"], self.other_company.id)
