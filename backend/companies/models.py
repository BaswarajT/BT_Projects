from django.conf import settings
from django.db import models


class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=30, unique=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="companies_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "companies"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PlatformSettings(models.Model):
    """Singleton (always pk=1) holding platform-wide controls only a Global Admin
    can change. `get_solo()` is the only way this should ever be read/created —
    never query/create it directly, so there's exactly one row, ever."""

    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(
        blank=True,
        default="BT Projects is undergoing scheduled maintenance. Please check back shortly.",
    )
    announcement_banner = models.CharField(max_length=500, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+",
    )

    class Meta:
        verbose_name_plural = "platform settings"

    def __str__(self):
        return "Platform Settings"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
