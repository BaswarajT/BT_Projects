from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User

from .models import Company, PlatformSettings


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


class GlobalAdminStatsPermissionTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="STAT01")
        self.global_admin = User.objects.create_user(
            username="root2", password="StrongPassword123", role="GLOBAL_ADMIN"
        )
        self.super_admin = User.objects.create_user(
            username="boss2", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )

    def test_global_admin_can_read_stats(self):
        self.client.force_authenticate(self.global_admin)
        response = self.client.get("/api/global-admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_companies", response.data)
        self.assertIn("companies_by_size", response.data)

    def test_super_admin_cannot_read_stats(self):
        self.client.force_authenticate(self.super_admin)
        response = self.client.get("/api/global-admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_read_stats(self):
        response = self.client.get("/api/global-admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PlatformSettingsPermissionTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme2", code="STAT02")
        self.global_admin = User.objects.create_user(
            username="root3", password="StrongPassword123", role="GLOBAL_ADMIN"
        )
        self.member = User.objects.create_user(
            username="member3", password="StrongPassword123", company=self.company, role="MEMBER"
        )

    def test_defaults_to_maintenance_off(self):
        self.client.force_authenticate(self.member)
        response = self.client.get("/api/platform-settings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["maintenance_mode"])
        self.assertEqual(response.data["announcement_banner"], "")

    def test_any_authenticated_user_can_read_settings(self):
        self.client.force_authenticate(self.member)
        response = self.client.get("/api/platform-settings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_regular_member_cannot_change_settings(self):
        self.client.force_authenticate(self.member)
        response = self.client.patch(
            "/api/platform-settings/", {"maintenance_mode": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(PlatformSettings.get_solo().maintenance_mode)

    def test_global_admin_can_toggle_maintenance_mode(self):
        self.client.force_authenticate(self.global_admin)
        response = self.client.patch(
            "/api/platform-settings/",
            {"maintenance_mode": True, "announcement_banner": "Testing"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        settings = PlatformSettings.get_solo()
        self.assertTrue(settings.maintenance_mode)
        self.assertEqual(settings.announcement_banner, "Testing")
        self.assertEqual(settings.updated_by_id, self.global_admin.id)
