from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from companies.models import Company

from .models import OTPCode, User


class TokenRefreshForDeletedUserTest(APITestCase):
    def test_refresh_for_deleted_user_returns_clean_error_not_500(self):
        user = User.objects.create_user(username="soon_deleted", password="StrongPassword123")
        refresh = str(RefreshToken.for_user(user))
        user.delete()

        response = self.client.post("/api/token/refresh/", {"refresh": refresh}, format="json")
        self.assertNotEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class OtpVerificationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="verifyme", password="StrongPassword123",
            email="verifyme@example.com", phone="+919876543210", country="IN",
        )
        self.client.force_authenticate(self.user)

    def latest_code(self, purpose):
        return OTPCode.objects.filter(user=self.user, purpose=purpose).latest("created_at").code

    def test_email_otp_request_and_confirm(self):
        request_resp = self.client.post("/api/verify/email/request/")
        self.assertEqual(request_resp.status_code, status.HTTP_200_OK)

        confirm_resp = self.client.post(
            "/api/verify/email/confirm/", {"code": self.latest_code("EMAIL")}, format="json"
        )
        self.assertEqual(confirm_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(confirm_resp.data["email_verified"])

    def test_wrong_code_rejected(self):
        self.client.post("/api/verify/phone/request/")
        confirm_resp = self.client.post("/api/verify/phone/confirm/", {"code": "000000"}, format="json")
        self.assertEqual(confirm_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_changing_email_resets_verification(self):
        self.client.post("/api/verify/email/request/")
        self.client.post("/api/verify/email/confirm/", {"code": self.latest_code("EMAIL")}, format="json")
        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)

        self.client.patch("/api/me/", {"email": "new@example.com"}, format="json")
        self.user.refresh_from_db()
        self.assertFalse(self.user.email_verified)


class RoleManagementTest(APITestCase):
    """Role hierarchy: GLOBAL_ADMIN (platform) > SUPER_ADMIN (full company control,
    manages users) > ADMIN (company-wide project visibility, NO user management) >
    regular roles (scoped to their own projects)."""

    def setUp(self):
        self.company_a = Company.objects.create(name="Company A", code="COA2")
        self.company_b = Company.objects.create(name="Company B", code="COB2")
        self.admin_a = User.objects.create_user(
            username="admin_a", password="StrongPassword123", company=self.company_a, role="ADMIN"
        )
        self.super_admin_a = User.objects.create_user(
            username="super_admin_a", password="StrongPassword123", company=self.company_a, role="SUPER_ADMIN"
        )
        self.member_a = User.objects.create_user(
            username="member_a", password="StrongPassword123", company=self.company_a
        )
        self.member_b = User.objects.create_user(
            username="member_b", password="StrongPassword123", company=self.company_b
        )
        self.global_admin = User.objects.create_user(
            username="root", password="StrongPassword123", role="GLOBAL_ADMIN"
        )

    def test_regular_member_cannot_access_admin_endpoint(self):
        self.client.force_authenticate(self.member_a)
        response = self.client.get("/api/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_has_no_user_management_access(self):
        # Admin has company-wide project visibility but NOT user management.
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_only_sees_own_company_users(self):
        self.client.force_authenticate(self.super_admin_a)
        response = self.client.get("/api/admin/users/")
        usernames = [u["username"] for u in response.data]
        self.assertIn("member_a", usernames)
        self.assertNotIn("member_b", usernames)

    def test_super_admin_cannot_create_user_in_other_company(self):
        self.client.force_authenticate(self.super_admin_a)
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "sneaky", "email": "sneaky@example.com", "password": "StrongPassword123",
                "role": "MEMBER", "company": self.company_b.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_super_admin_cannot_assign_super_admin_or_global_admin_role(self):
        self.client.force_authenticate(self.super_admin_a)
        for role in ("SUPER_ADMIN", "GLOBAL_ADMIN"):
            response = self.client.post(
                "/api/admin/users/",
                {
                    "username": f"wannabe_{role}", "email": f"{role}@example.com",
                    "password": "StrongPassword123", "role": role,
                },
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_super_admin_can_assign_admin_role_in_own_company(self):
        self.client.force_authenticate(self.super_admin_a)
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "newhire", "email": "newhire@example.com", "password": "StrongPassword123",
                "first_name": "Jordan", "last_name": "Lee", "role": "ADMIN",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username="newhire")
        self.assertEqual(created.company_id, self.company_a.id)
        self.assertEqual(created.role, "ADMIN")

    def test_global_admin_sees_all_users_and_can_create_anywhere(self):
        self.client.force_authenticate(self.global_admin)
        response = self.client.get("/api/admin/users/")
        usernames = [u["username"] for u in response.data]
        self.assertIn("member_a", usernames)
        self.assertIn("member_b", usernames)

        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "platform_hire", "email": "ph@example.com", "password": "StrongPassword123",
                "first_name": "Priya", "last_name": "Nair", "role": "SUPER_ADMIN", "company": self.company_b.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(username="platform_hire").company_id, self.company_b.id)

    def test_super_admin_can_create_user_with_blank_password_and_explicit_null_company(self):
        # Matches exactly what the frontend form sends: password left blank (should
        # auto-generate one) and company explicitly set to null (should be forced to
        # the admin's own company, not rejected).
        self.client.force_authenticate(self.super_admin_a)
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "blankpw", "email": "blankpw@example.com", "password": "",
                "first_name": "Alex", "last_name": "Kim", "role": "MEMBER", "company": None,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username="blankpw")
        self.assertEqual(created.company_id, self.company_a.id)
        self.assertTrue(created.has_usable_password())


class UserNameValidationTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="NAME1")
        self.admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )
        self.client.force_authenticate(self.admin)

    def base_payload(self, **overrides):
        payload = {
            "username": "newperson", "email": "newperson@example.com", "password": "StrongPassword123",
            "first_name": "Baswaraj", "last_name": "Tugashatte", "role": "MEMBER",
        }
        payload.update(overrides)
        return payload

    def test_blank_names_rejected(self):
        response = self.client.post(
            "/api/admin/users/", self.base_payload(first_name="", last_name=""), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", response.data)
        self.assertIn("last_name", response.data)

    def test_names_with_digits_rejected(self):
        response = self.client.post(
            "/api/admin/users/", self.base_payload(first_name="Bas4araj"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", response.data)

    def test_names_are_title_cased(self):
        response = self.client.post(
            "/api/admin/users/", self.base_payload(first_name="baswaraj", last_name="TUGASHATTE"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username="newperson")
        self.assertEqual(created.first_name, "Baswaraj")
        self.assertEqual(created.last_name, "Tugashatte")


class DuplicateEmailTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="DUPE1")
        self.admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )
        self.existing = User.objects.create_user(
            username="taken", password="StrongPassword123", company=self.company,
            email="taken@example.com", first_name="Taken", last_name="User",
        )
        self.client.force_authenticate(self.admin)

    def test_duplicate_email_rejected_case_insensitively(self):
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "newperson", "email": "TAKEN@example.com", "password": "StrongPassword123",
                "first_name": "New", "last_name": "Person", "role": "MEMBER",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_deleted_accounts_email_still_reserved(self):
        self.client.delete(f"/api/admin/users/{self.existing.id}/")
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "newperson", "email": "taken@example.com", "password": "StrongPassword123",
                "first_name": "New", "last_name": "Person", "role": "MEMBER",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("deleted account", str(response.data["email"]))

    def test_updating_own_email_to_same_value_is_fine(self):
        response = self.client.patch(
            f"/api/admin/users/{self.existing.id}/", {"email": "taken@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SoftDeleteAndRestoreTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="SOFT1")
        self.admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )
        self.target = User.objects.create_user(
            username="leaving", password="StrongPassword123", company=self.company,
            email="leaving@example.com", first_name="Leaving", last_name="User",
        )
        self.client.force_authenticate(self.admin)

    def test_delete_soft_deletes_not_hard_deletes(self):
        response = self.client.delete(f"/api/admin/users/{self.target.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.target.refresh_from_db()
        self.assertIsNotNone(self.target.deleted_at)
        self.assertFalse(self.target.is_active)

    def test_deleted_user_disappears_from_active_list_but_appears_in_recycle_bin(self):
        self.client.delete(f"/api/admin/users/{self.target.id}/")

        active_response = self.client.get("/api/admin/users/")
        self.assertNotIn("leaving", [u["username"] for u in active_response.data])

        bin_response = self.client.get("/api/admin/users/recycle-bin/")
        self.assertEqual(bin_response.status_code, status.HTTP_200_OK)
        self.assertIn("leaving", [u["username"] for u in bin_response.data])

    def test_restore_reactivates_and_returns_to_active_list(self):
        self.client.delete(f"/api/admin/users/{self.target.id}/")
        response = self.client.post(f"/api/admin/users/{self.target.id}/restore/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertIsNone(self.target.deleted_at)
        self.assertTrue(self.target.is_active)

        active_response = self.client.get("/api/admin/users/")
        self.assertIn("leaving", [u["username"] for u in active_response.data])

    def test_search_by_email(self):
        response = self.client.get("/api/admin/users/", {"search": "leaving@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([u["username"] for u in response.data], ["leaving"])
