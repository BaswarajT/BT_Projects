from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from sales.models import SalesProject
from users.models import User

from .models import Client


class ClientAccessTest(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A", code="CLIA1")
        self.company_b = Company.objects.create(name="Company B", code="CLIB1")

        self.super_admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company_a, role="SUPER_ADMIN"
        )
        self.sales_manager = User.objects.create_user(
            username="sales_mgr", password="StrongPassword123", company=self.company_a, role="SALES_MANAGER"
        )
        self.salesperson_a = User.objects.create_user(
            username="sales_a", password="StrongPassword123", company=self.company_a, role="SALESPERSON"
        )
        self.salesperson_a2 = User.objects.create_user(
            username="sales_a2", password="StrongPassword123", company=self.company_a, role="SALESPERSON"
        )
        self.member = User.objects.create_user(
            username="regular_member", password="StrongPassword123", company=self.company_a, role="MEMBER"
        )

        self.client_owned_by_a = Client.objects.create(
            company=self.company_a, name="Owned By A", salesperson=self.salesperson_a
        )
        self.client_owned_by_a2 = Client.objects.create(
            company=self.company_a, name="Owned By A2", salesperson=self.salesperson_a2
        )
        self.client_b = Client.objects.create(company=self.company_b, name="Company B Client")

    def test_regular_member_forbidden(self):
        self.client.force_authenticate(self.member)
        response = self.client.get("/api/clients/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_sees_only_own_clients(self):
        self.client.force_authenticate(self.salesperson_a)
        response = self.client.get("/api/clients/")
        names = [c["name"] for c in response.data]
        self.assertIn("Owned By A", names)
        self.assertNotIn("Owned By A2", names)
        self.assertNotIn("Company B Client", names)

    def test_sales_manager_sees_all_company_clients(self):
        self.client.force_authenticate(self.sales_manager)
        response = self.client.get("/api/clients/")
        names = [c["name"] for c in response.data]
        self.assertIn("Owned By A", names)
        self.assertIn("Owned By A2", names)
        self.assertNotIn("Company B Client", names)

    def test_super_admin_cannot_create_client_in_other_company(self):
        self.client.force_authenticate(self.super_admin)
        response = self.client.post(
            "/api/clients/", {"name": "Sneaky", "company": self.company_b.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_computed_deal_and_project_stats(self):
        SalesProject.objects.create(
            company=self.company_a, name="Deal 1", client=self.client_owned_by_a,
            salesperson=self.salesperson_a, stage="WON", amount=100000,
        )
        SalesProject.objects.create(
            company=self.company_a, name="Deal 2", client=self.client_owned_by_a,
            salesperson=self.salesperson_a, stage="NEW", amount=50000,
        )
        self.client.force_authenticate(self.sales_manager)
        response = self.client.get(f"/api/clients/{self.client_owned_by_a.id}/")
        self.assertEqual(response.data["total_deals"], 2)
        self.assertEqual(response.data["won_deals"], 1)
        self.assertEqual(response.data["total_revenue"], 100000.0)
