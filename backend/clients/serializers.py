from django.db.models import Sum
from rest_framework import serializers

from users.permissions import is_global_admin

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    account_manager_name = serializers.CharField(source="account_manager.username", read_only=True, default=None)
    salesperson_name = serializers.CharField(source="salesperson.username", read_only=True, default=None)
    company_name = serializers.CharField(source="company.name", read_only=True, default=None)
    total_deals = serializers.SerializerMethodField()
    won_deals = serializers.SerializerMethodField()
    active_projects = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "company", "company_name", "name", "code", "industry", "website",
            "country", "state", "city", "address",
            "primary_contact_name", "contact_email", "contact_phone",
            "account_manager", "account_manager_name", "salesperson", "salesperson_name",
            "status", "notes", "total_deals", "won_deals", "active_projects", "total_revenue",
            "created_at", "updated_at",
        ]

    def get_total_deals(self, obj):
        return obj.sales_projects.count()

    def get_won_deals(self, obj):
        return obj.sales_projects.filter(stage="WON").count()

    def get_active_projects(self, obj):
        return obj.projects.exclude(status__in=["COMPLETED", "CANCELLED"]).count()

    def get_total_revenue(self, obj):
        total = obj.sales_projects.filter(stage="WON").aggregate(total=Sum("amount"))["total"]
        return float(total or 0)

    def validate_company(self, value):
        requester = self.context["request"].user
        if is_global_admin(requester):
            return value
        if value not in (None, requester.company):
            raise serializers.ValidationError("You can only manage clients within your own company.")
        return requester.company
