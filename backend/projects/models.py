from django.conf import settings
from django.db import models


class Project(models.Model):
    STATUS_CHOICES = [
        ("PLANNING", "Planning"),
        ("ACTIVE", "Active"),
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
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30, unique=True)
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
    pmo_name = models.CharField("PMO name", max_length=255, blank=True)
    region = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="MEDIUM")
    budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PLANNING")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
