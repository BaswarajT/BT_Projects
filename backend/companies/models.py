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
