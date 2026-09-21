from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company

from .models import OTPCode, User


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
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A", code="COA2")
        self.company_b = Company.objects.create(name="Company B", code="COB2")
        self.admin_a = User.objects.create_user(
            username="admin_a", password="StrongPassword123", company=self.company_a, role="ADMIN"
        )
        self.member_a = User.objects.create_user(
            username="member_a", password="StrongPassword123", company=self.company_a
        )
        self.member_b = User.objects.create_user(
            username="member_b", password="StrongPassword123", company=self.company_b
        )
        self.super_admin = User.objects.create_user(username="root", password="StrongPassword123", role="SUPER_ADMIN")

    def test_regular_member_cannot_access_admin_endpoint(self):
        self.client.force_authenticate(self.member_a)
        response = self.client.get("/api/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_company_admin_only_sees_own_company_users(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/admin/users/")
        usernames = [u["username"] for u in response.data]
        self.assertIn("member_a", usernames)
        self.assertNotIn("member_b", usernames)

    def test_company_admin_cannot_create_user_in_other_company(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "sneaky", "email": "sneaky@example.com", "password": "StrongPassword123",
                "role": "MEMBER", "company": self.company_b.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_company_admin_cannot_assign_super_admin_role(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "wannabe", "email": "wannabe@example.com", "password": "StrongPassword123",
                "role": "SUPER_ADMIN",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_company_admin_can_create_user_in_own_company(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "newhire", "email": "newhire@example.com", "password": "StrongPassword123",
                "role": "TEAM_LEAD",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username="newhire")
        self.assertEqual(created.company_id, self.company_a.id)
        self.assertEqual(created.role, "TEAM_LEAD")

    def test_super_admin_sees_all_users_and_can_create_anywhere(self):
        self.client.force_authenticate(self.super_admin)
        response = self.client.get("/api/admin/users/")
        usernames = [u["username"] for u in response.data]
        self.assertIn("member_a", usernames)
        self.assertIn("member_b", usernames)

        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "platform_hire", "email": "ph@example.com", "password": "StrongPassword123",
                "role": "ADMIN", "company": self.company_b.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(username="platform_hire").company_id, self.company_b.id)

    def test_company_admin_can_create_user_with_blank_password_and_explicit_null_company(self):
        # Matches exactly what the frontend form sends: password left blank (should
        # auto-generate one) and company explicitly set to null (should be forced to
        # the admin's own company, not rejected).
        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/admin/users/",
            {
                "username": "blankpw", "email": "blankpw@example.com", "password": "",
                "first_name": "", "last_name": "", "role": "MEMBER", "company": None,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username="blankpw")
        self.assertEqual(created.company_id, self.company_a.id)
        self.assertTrue(created.has_usable_password())
