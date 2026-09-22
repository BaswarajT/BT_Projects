from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project
from sales.models import SalesProject
from users.permissions import IsGlobalAdmin, is_global_admin

from .models import Company, PlatformSettings
from .serializers import CompanySerializer, PlatformSettingsSerializer

User = get_user_model()


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsGlobalAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_global_admin(user):
            return Company.objects.all()
        if user.company_id:
            return Company.objects.filter(id=user.company_id)
        return Company.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PlatformSettingsView(APIView):
    """Singleton settings. GET is open to any authenticated user (the maintenance
    banner and announcement need to be checked by everyone) — only PATCH is
    Global-Admin-only."""

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), IsGlobalAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        return Response(PlatformSettingsSerializer(PlatformSettings.get_solo()).data)

    def patch(self, request):
        instance = PlatformSettings.get_solo()
        serializer = PlatformSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)


class GlobalAdminStatsView(APIView):
    permission_classes = [IsAuthenticated, IsGlobalAdmin]

    def get(self, request):
        since_30_days = timezone.now() - timedelta(days=30)
        open_pipeline = SalesProject.objects.filter(
            stage__in=SalesProject.OPEN_STAGES
        ).aggregate(total=Sum("amount"))["total"] or 0

        return Response({
            "total_companies": Company.objects.count(),
            "active_companies": Company.objects.filter(is_active=True).count(),
            "total_users": User.objects.count(),
            "active_users": User.objects.filter(is_active=True).count(),
            "total_projects": Project.objects.filter(deleted_at__isnull=True).count(),
            "total_deals": SalesProject.objects.exclude(stage="CANCELLED").count(),
            "open_pipeline_value": float(open_pipeline),
            "companies_last_30_days": Company.objects.filter(created_at__gte=since_30_days).count(),
            "users_last_30_days": User.objects.filter(date_joined__gte=since_30_days).count(),
            "companies_by_size": [
                {
                    "id": c.id,
                    "name": c.name,
                    "user_count": c.users.count(),
                    "project_count": c.projects.filter(deleted_at__isnull=True).count(),
                }
                for c in Company.objects.all().order_by("name")
            ],
        })
