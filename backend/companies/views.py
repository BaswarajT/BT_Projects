from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsSuperAdmin, is_super_admin

from .models import Company
from .serializers import CompanySerializer


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [IsAuthenticated(), IsSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return Company.objects.all()
        if user.company_id:
            return Company.objects.filter(id=user.company_id)
        return Company.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
