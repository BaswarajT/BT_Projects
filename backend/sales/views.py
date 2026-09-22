from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from projects.models import Project, ProjectMember
from users.permissions import (
    HasSalesAccess,
    has_company_wide_visibility,
    is_global_admin,
    is_sales_manager,
)

from .models import SalesProject
from .serializers import SalesProjectSerializer


class SalesProjectViewSet(viewsets.ModelViewSet):
    serializer_class = SalesProjectSerializer
    permission_classes = [IsAuthenticated, HasSalesAccess]
    filterset_fields = ["stage", "priority", "client"]
    search_fields = ["name", "client__name", "client_contact", "lead_source", "technology"]
    ordering_fields = ["updated_at", "created_at", "amount", "expected_close_date"]

    def get_queryset(self):
        user = self.request.user
        base = SalesProject.objects.select_related("client", "salesperson", "sales_manager", "company")
        if is_global_admin(user):
            return base.all()
        base = base.filter(company=user.company)
        if has_company_wide_visibility(user) or is_sales_manager(user):
            return base
        # Salesperson: only deals they own.
        return base.filter(salesperson=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="convert-to-project")
    def convert_to_project(self, request, pk=None):
        sales_project = self.get_object()

        if sales_project.stage != "WON":
            raise ValidationError({"detail": "Only a Won sales project can be converted to a project."})
        if sales_project.linked_project_id:
            raise ValidationError({"detail": "This sales project already has a linked project."})

        code = (request.data.get("code") or "").strip()
        if not code:
            client_tag = "".join(ch for ch in sales_project.client.name.upper() if ch.isalnum())[:6] or "CLI"
            code = f"{client_tag}-{sales_project.id}"
        if Project.objects.filter(code=code).exists():
            raise ValidationError({"code": [f'A project with code "{code}" already exists.']})

        owner = sales_project.project_manager or sales_project.salesperson
        project = Project.objects.create(
            name=sales_project.name,
            code=code,
            owner=owner,
            company=sales_project.company,
            client=sales_project.client,
            budget=sales_project.amount,
            start_date=sales_project.expected_start_date,
            end_date=sales_project.expected_end_date,
            priority=sales_project.priority,
            status="PLANNING",
        )
        ProjectMember.objects.get_or_create(project=project, user=owner)

        sales_project.linked_project = project
        sales_project.save(update_fields=["linked_project"])

        return Response(self.get_serializer(sales_project).data)
