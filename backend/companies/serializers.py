from rest_framework import serializers

from .models import Company, PlatformSettings


class CompanySerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = Company
        fields = [
            "id", "name", "code", "is_active", "created_at",
            "created_by", "created_by_name", "user_count", "project_count",
        ]
        read_only_fields = ["created_by"]

    def get_user_count(self, obj):
        return obj.users.count()

    def get_project_count(self, obj):
        return obj.projects.count()


class PlatformSettingsSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source="updated_by.username", read_only=True, default=None)

    class Meta:
        model = PlatformSettings
        fields = [
            "maintenance_mode", "maintenance_message", "announcement_banner",
            "updated_at", "updated_by", "updated_by_name",
        ]
        read_only_fields = ["updated_at", "updated_by"]
