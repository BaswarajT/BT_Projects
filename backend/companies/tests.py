from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User

from .models import Company


class CompanyEditPermissionTest(APITestCase):
    """Renaming a company (or any company field) is Global Admin only — Super Admin,
    Admin and regular members can view their own company but not edit it."""

    def setUp(self):
        self.company = Company.objects.create(name="Old Name", code="EDIT01")
        self.global_admin = User.objects.create_user(
            username="root", password="StrongPassword123", role="GLOBAL_ADMIN"
        )
        self.super_admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )
        self.member = User.objects.create_user(
            username="member", password="StrongPassword123", company=self.company, role="MEMBER"
        )

    def test_global_admin_can_rename_company(self):
        self.client.force_authenticate(self.global_admin)
        response = self.client.patch(
            f"/api/companies/{self.company.id}/", {"name": "New Name"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.name, "New Name")

    def test_super_admin_cannot_rename_own_company(self):
        self.client.force_authenticate(self.super_admin)
        response = self.client.patch(
            f"/api/companies/{self.company.id}/", {"name": "Hijacked"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.company.refresh_from_db()
        self.assertEqual(self.company.name, "Old Name")

    def test_regular_member_cannot_rename_own_company(self):
        self.client.force_authenticate(self.member)
        response = self.client.patch(
            f"/api/companies/{self.company.id}/", {"name": "Hijacked"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
