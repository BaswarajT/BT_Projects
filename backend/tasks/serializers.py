from rest_framework import serializers

from .models import Task, TaskDependency, TimeEntry


class TaskSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.username", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "project", "title", "description", "assigned_to", "assigned_to_name",
            "created_by", "created_by_name", "status", "priority", "start_date", "due_date",
            "estimated_hours", "actual_hours", "parent_task", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]


class TaskDependencySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskDependency
        fields = ["id", "task", "depends_on", "created_at"]


class TimeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeEntry
        fields = ["id", "task", "user", "hours", "note", "logged_at"]
        read_only_fields = ["user", "logged_at"]
