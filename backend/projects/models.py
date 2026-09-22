import re

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

PR_CODE_PATTERN = re.compile(r"^PR-(\d+)$")


def generate_next_project_code(company):
    """Next sequential "PR-1001", "PR-1002", ... code for this company. Each company
    gets its own independent sequence. Looks at every code (active or recycled) the
    company has ever used — not just a row count — so a deleted project's number is
    never reused and legacy manually-typed codes (e.g. "PR-1234") are respected as a
    floor rather than collided with."""
    existing_codes = Project.objects.filter(company=company).values_list("code", flat=True)
    highest = 1000
    for code in existing_codes:
        match = PR_CODE_PATTERN.match(code or "")
        if match:
            highest = max(highest, int(match.group(1)))
    return f"PR-{highest + 1}"


class Project(models.Model):
    STATUS_CHOICES = [
        ("PLANNING", "Planning"),
        ("ACTIVE", "Ongoing"),
        ("ON_HOLD", "On Hold"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]
    PRIORITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]
    PROJECT_TYPE_CHOICES = [
        ("MRA", "MRA"),
        ("NON_MRA", "Non MRA"),
    ]
    name = models.CharField(max_length=255)
    code = models.CharField("Project ID", max_length=30)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_projects"
    )
    company = models.ForeignKey(
        "companies.Company", on_delete=models.CASCADE, related_name="projects", null=True, blank=True
    )
    client = models.ForeignKey(
        "clients.Client", on_delete=models.SET_NULL, related_name="projects", null=True, blank=True
    )
    # Legacy free-text PMO field kept for existing historical data; `pmo` below is the
    # structured, filterable, picker-driven replacement used going forward.
    pmo_name = models.CharField("PMO name", max_length=255, blank=True)
    pmo = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="pmo_projects",
    )
    region = models.CharField("Sales Region", max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="MEDIUM")
    budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PLANNING")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    percent_complete = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    project_group = models.CharField("Project Group / LOB", max_length=150, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="projects_created",
    )
    completion_date = models.DateField("Completion Time", null=True, blank=True)
    unique_order_id = models.CharField(max_length=100, blank=True)
    po_status = models.CharField(max_length=100, blank=True)
    po_number = models.CharField("PO No.", max_length=100, blank=True)
    currency = models.CharField(max_length=10, blank=True)
    po_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    man_days = models.PositiveIntegerField("Project Man Days", null=True, blank=True)
    sales_person = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="sales_person_projects",
    )
    category_a = models.CharField("Project Category-A", max_length=150, blank=True)
    category_b = models.CharField("Project Category-B", max_length=150, blank=True)
    contract_type = models.CharField(max_length=150, blank=True)
    comments = models.TextField(blank=True)
    project_comments = models.TextField(blank=True)
    overrun_comments = models.TextField(blank=True)
    po_date = models.DateField(null=True, blank=True)
    billing_entity = models.CharField(max_length=150, blank=True)
    budget_type = models.CharField(max_length=100, blank=True)
    working_emp = models.CharField("Working Emp", max_length=255, blank=True)
    lob_head = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="lob_head_projects",
    )
    delivery_leads = models.CharField(max_length=255, blank=True)
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE_CHOICES, blank=True)
    # Kept as its own column (not just derived from `status`) because the source
    # spreadsheet this was modeled on tracks it separately from the operational status.
    completion_status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True, default=None, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["company", "code"], name="unique_project_code_per_company")
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class ProjectMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "user"], name="unique_project_member")
        ]

    def __str__(self):
        return f"{self.user} @ {self.project}"


class Milestone(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
