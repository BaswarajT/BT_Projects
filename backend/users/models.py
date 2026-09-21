import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .countries import COUNTRY_CHOICES


def avatar_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"avatars/{uuid.uuid4().hex}.{ext}"


class User(AbstractUser):
    ROLE_CHOICES = [
        ("SUPER_ADMIN", "Super Admin"),
        ("ADMIN", "Company Admin"),
        ("PROJECT_MANAGER", "Project Manager"),
        ("TEAM_LEAD", "Team Lead"),
        ("MEMBER", "Member"),
        ("CLIENT", "Client"),
        ("VIEWER", "Viewer"),
    ]
    GENDER_CHOICES = [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("OTHER", "Other"),
        ("UNSPECIFIED", "Prefer not to say"),
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="MEMBER")
    company = models.ForeignKey(
        "companies.Company", on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )
    phone = models.CharField(max_length=30, blank=True)
    avatar = models.ImageField(upload_to=avatar_upload_path, null=True, blank=True)
    display_name = models.CharField(max_length=150, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True)
    country = models.CharField(max_length=2, choices=COUNTRY_CHOICES, blank=True)
    state = models.CharField(max_length=100, blank=True)
    language = models.CharField(max_length=50, blank=True, default="English")
    timezone = models.CharField(max_length=50, blank=True, default="Asia/Kolkata")
    job_title = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=150, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    website = models.URLField(max_length=255, blank=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username


class OTPCode(models.Model):
    PURPOSE_CHOICES = [("EMAIL", "Email"), ("PHONE", "Phone")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_codes")
    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES)
    target = models.CharField(max_length=255)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    def is_valid(self):
        return self.consumed_at is None and timezone.now() < self.expires_at
