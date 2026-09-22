from django.conf import settings
from django.db import models

from users.countries import COUNTRY_CHOICES


class Client(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    ]

    company = models.ForeignKey(
        "companies.Company", on_delete=models.CASCADE, related_name="clients"
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30, blank=True)
    industry = models.CharField(max_length=150, blank=True)
    website = models.URLField(max_length=255, blank=True)
    country = models.CharField(max_length=2, choices=COUNTRY_CHOICES, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    primary_contact_name = models.CharField(max_length=150, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    account_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="managed_clients",
    )
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="owned_clients",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="clients_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
