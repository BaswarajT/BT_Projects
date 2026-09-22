from rest_framework import serializers

from .models import Milestone, Project, ProjectMember


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.username", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True, default=None)
    client_name = serializers.CharField(source="client.name", read_only=True, default=None)
    pmo_owner_name = serializers.CharField(source="pmo.username", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)
    sales_person_name = serializers.CharField(source="sales_person.username", read_only=True, default=None)
    lob_head_name = serializers.CharField(source="lob_head.username", read_only=True, default=None)

    class Meta:
        model = Project
        fields = [
            "id", "name", "code", "description", "owner", "owner_name", "company", "company_name",
            "client", "client_name", "pmo_name", "pmo", "pmo_owner_name", "region", "state",
            "priority", "budget", "status", "start_date", "end_date", "created_at", "updated_at",
            "percent_complete", "project_group", "created_by", "created_by_name", "completion_date",
            "unique_order_id", "po_status", "po_number", "currency", "po_value", "man_days",
            "sales_person", "sales_person_name", "category_a", "category_b", "contract_type",
            "comments", "project_comments", "overrun_comments", "po_date", "billing_entity",
            "budget_type", "working_emp", "lob_head", "lob_head_name", "delivery_leads",
            "project_type", "completion_status", "deleted_at",
        ]
        # `code` is server-generated (see Project.generate_next_project_code) — never
        # settable by the client, so a duplicate/mistyped Project ID can't happen.
        read_only_fields = ["code", "owner", "company", "created_by", "deleted_at"]


class ProjectMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ["id", "project", "user", "username", "joined_at"]
        read_only_fields = ["joined_at"]


class MilestoneSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True)

    class Meta:
        model = Milestone
        fields = [
            "id", "project", "project_name", "project_code", "title", "description",
            "due_date", "is_completed", "created_at",
        ]
