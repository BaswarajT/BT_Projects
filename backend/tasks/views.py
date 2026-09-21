from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from users.permissions import is_company_admin, is_super_admin

from .models import Task, TaskDependency, TimeEntry
from .serializers import TaskDependencySerializer, TaskSerializer, TimeEntrySerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "priority", "project", "assigned_to"]
    search_fields = ["title", "description"]
    ordering_fields = ["due_date", "priority", "created_at"]

    def get_queryset(self):
        user = self.request.user
        base = Task.objects.select_related("project", "assigned_to", "created_by")
        if is_super_admin(user):
            return base.distinct()
        if is_company_admin(user):
            return base.filter(project__company=user.company).distinct()
        return base.filter(project__members__user=user).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskDependencyViewSet(viewsets.ModelViewSet):
    serializer_class = TaskDependencySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return TaskDependency.objects.all()
        if is_company_admin(user):
            return TaskDependency.objects.filter(task__project__company=user.company)
        return TaskDependency.objects.filter(task__project__members__user=user).distinct()


class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return TimeEntry.objects.all()
        if is_company_admin(user):
            return TimeEntry.objects.filter(task__project__company=user.company)
        return TimeEntry.objects.filter(task__project__members__user=user).distinct()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
