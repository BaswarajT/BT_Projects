from decimal import Decimal

from django.conf import settings
from django.db import models


class SalesProject(models.Model):
    """The master sales record — an opportunity/deal in one place. Deals is a
    pipeline-focused view over this same table, not a separate source of truth."""

    STAGE_CHOICES = [
        ("NEW", "New"),
        ("QUALIFICATION", "Qualification"),
        ("DISCOVERY", "Discovery"),
        ("PROPOSAL", "Proposal"),
        ("NEGOTIATION", "Negotiation"),
        ("HOLD", "Hold"),
        ("WON", "Won"),
        ("LOST", "Lost"),
        ("CANCELLED", "Cancelled"),
    ]
    OPEN_STAGES = ["NEW", "QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "HOLD"]
    CLOSED_STAGES = ["WON", "LOST", "CANCELLED"]
    PRIORITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    company = models.ForeignKey(
        "companies.Company", on_delete=models.CASCADE, related_name="sales_projects"
    )
    name = models.CharField(max_length=255)
    client = models.ForeignKey(
        "clients.Client", on_delete=models.CASCADE, related_name="sales_projects"
    )
    client_contact = models.CharField(max_length=150, blank=True)
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_deals"
    )
    sales_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="managed_deals",
    )
    presales_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="presales_deals",
    )
    pmo = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="pmo_deals",
    )
    project_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="pm_deals",
    )
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default="NEW")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="MEDIUM")
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="INR")
    probability = models.PositiveSmallIntegerField(default=10)
    region = models.CharField(max_length=100, blank=True)
    lead_source = models.CharField(max_length=150, blank=True)
    solution = models.TextField(blank=True)
    technology = models.CharField(max_length=150, blank=True)
    competitor = models.CharField(max_length=150, blank=True)
    decision_maker = models.CharField(max_length=150, blank=True)
    next_action = models.CharField(max_length=255, blank=True)
    next_action_date = models.DateField(null=True, blank=True)
    expected_start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    expected_close_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    linked_project = models.OneToOneField(
        "projects.Project", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="sales_project",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="sales_projects_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name

    @property
    def weighted_amount(self):
        return (self.amount or Decimal(0)) * Decimal(self.probability) / Decimal(100)
