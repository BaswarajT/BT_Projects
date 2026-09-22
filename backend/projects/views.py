from django.db import models
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from users.permissions import has_company_wide_visibility, is_global_admin

from .exports import export_projects_csv, export_projects_xlsx
from .filters import ProjectFilter
from .models import Milestone, Project, ProjectMember
from .serializers import MilestoneSerializer, ProjectMemberSerializer, ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ProjectFilter
    search_fields = [
        "name", "code", "description", "pmo_name", "project_group", "unique_order_id",
        "po_number", "category_a", "category_b", "billing_entity",
    ]
    ordering_fields = ["created_at", "start_date", "end_date", "name", "percent_complete"]

    def get_queryset(self):
        user = self.request.user
        if is_global_admin(user):
            base = Project.objects.all()
        elif has_company_wide_visibility(user):
            base = Project.objects.filter(company=user.company)
        else:
            base = Project.objects.filter(
                models.Q(owner=user) | models.Q(members__user=user), company=user.company
            ).distinct()
        return base.select_related("owner", "company", "client", "pmo", "created_by", "sales_person", "lob_head")

    def perform_create(self, serializer):
        project = serializer.save(
            owner=self.request.user, company=self.request.user.company, created_by=self.request.user
        )
        ProjectMember.objects.get_or_create(project=project, user=self.request.user)

    @action(detail=False, methods=["get"], url_path="export")
    def export_projects(self, request):
        # Uses "filetype", not "format" — the latter is DRF's own reserved content-
        # negotiation query param, and requesting an unregistered renderer format
        # (e.g. "csv") through it raises a 404 before this method even runs.
        filetype = request.query_params.get("filetype", "csv").lower()
        projects = self.filter_queryset(self.get_queryset())
        if filetype == "xlsx":
            return export_projects_xlsx(projects)
        if filetype == "csv":
            return export_projects_csv(projects)
        raise ValidationError({"filetype": ['Use "csv" or "xlsx".']})


class ProjectMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_global_admin(user):
            return ProjectMember.objects.all()
        if has_company_wide_visibility(user):
            return ProjectMember.objects.filter(project__company=user.company)
        return ProjectMember.objects.filter(
            models.Q(project__owner=user) | models.Q(project__members__user=user)
        ).distinct()


class MilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_global_admin(user):
            return Milestone.objects.all()
        if has_company_wide_visibility(user):
            return Milestone.objects.filter(project__company=user.company)
        return Milestone.objects.filter(project__members__user=user).distinct()
