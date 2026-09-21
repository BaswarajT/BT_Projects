from django.db import models
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from users.permissions import is_company_admin, is_super_admin

from .models import Milestone, Project, ProjectMember
from .serializers import MilestoneSerializer, ProjectMemberSerializer, ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "priority", "region"]
    search_fields = ["name", "code", "description", "pmo_name"]
    ordering_fields = ["created_at", "start_date", "end_date", "name"]

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return Project.objects.all()
        if is_company_admin(user):
            return Project.objects.filter(company=user.company)
        return Project.objects.filter(
            models.Q(owner=user) | models.Q(members__user=user), company=user.company
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user, company=self.request.user.company)
        ProjectMember.objects.get_or_create(project=project, user=self.request.user)


class ProjectMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return ProjectMember.objects.all()
        if is_company_admin(user):
            return ProjectMember.objects.filter(project__company=user.company)
        return ProjectMember.objects.filter(
            models.Q(project__owner=user) | models.Q(project__members__user=user)
        ).distinct()


class MilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return Milestone.objects.all()
        if is_company_admin(user):
            return Milestone.objects.filter(project__company=user.company)
        return Milestone.objects.filter(project__members__user=user).distinct()
