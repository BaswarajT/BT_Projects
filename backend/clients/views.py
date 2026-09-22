from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from users.permissions import (
    HasSalesAccess,
    has_company_wide_visibility,
    is_global_admin,
    is_sales_manager,
)

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, HasSalesAccess]
    filterset_fields = ["status"]
    search_fields = ["name", "code", "industry", "primary_contact_name", "contact_email"]
    ordering_fields = ["name", "created_at", "updated_at"]

    def get_queryset(self):
        user = self.request.user
        base = Client.objects.select_related("account_manager", "salesperson", "company")
        if is_global_admin(user):
            return base.all()
        base = base.filter(company=user.company)
        if has_company_wide_visibility(user) or is_sales_manager(user):
            return base
        # Salesperson: only clients they personally own.
        return base.filter(salesperson=user)

    def perform_create(self, serializer):
        # validate_company on the serializer already forces non-global-admins to their
        # own company, so validated_data["company"] is already correct here.
        serializer.save(created_by=self.request.user)
