from rest_framework import serializers

from .models import Milestone, Project, ProjectMember


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.username", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True, default=None)
    client_name = serializers.CharField(source="client.name", read_only=True, default=None)

    class Meta:
        model = Project
        fields = [
            "id", "name", "code", "description", "owner", "owner_name", "company", "company_name",
            "client", "client_name", "pmo_name", "region", "state", "priority", "budget",
            "status", "start_date", "end_date", "created_at", "updated_at",
        ]
        read_only_fields = ["owner", "company"]


class ProjectMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ["id", "project", "user", "username", "joined_at"]
        read_only_fields = ["joined_at"]


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ["id", "project", "title", "description", "due_date", "is_completed", "created_at"]
