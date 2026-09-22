from rest_framework import serializers

from users.permissions import is_global_admin

from .models import SalesProject

# `company` is a required FK on the model (every sales project belongs to exactly
# one company), but it's never something the client should have to pick — it's
# implied by who's creating it, same as every other company-scoped resource in
# this app. `required=False` here lets the client omit it entirely; `validate()`
# below fills it in from the requester (or, for Global Admin, requires it be
# picked explicitly, since they don't have a company of their own).


class SalesProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True, default=None)
    salesperson_name = serializers.CharField(source="salesperson.username", read_only=True)
    sales_manager_name = serializers.CharField(source="sales_manager.username", read_only=True, default=None)
    presales_owner_name = serializers.CharField(source="presales_owner.username", read_only=True, default=None)
    pmo_name = serializers.CharField(source="pmo.username", read_only=True, default=None)
    project_manager_name = serializers.CharField(source="project_manager.username", read_only=True, default=None)
    weighted_amount = serializers.SerializerMethodField()
    linked_project_code = serializers.CharField(source="linked_project.code", read_only=True, default=None)

    class Meta:
        model = SalesProject
        fields = [
            "id", "company", "company_name", "name",
            "client", "client_name", "client_contact",
            "salesperson", "salesperson_name", "sales_manager", "sales_manager_name",
            "presales_owner", "presales_owner_name", "pmo", "pmo_name",
            "project_manager", "project_manager_name",
            "stage", "priority", "amount", "currency", "probability", "weighted_amount",
            "region", "lead_source", "solution", "technology", "competitor", "decision_maker",
            "next_action", "next_action_date",
            "expected_start_date", "expected_end_date", "expected_close_date",
            "notes", "linked_project", "linked_project_code",
            "created_at", "updated_at",
        ]
        read_only_fields = ["linked_project"]
        extra_kwargs = {"company": {"required": False}}

    def get_weighted_amount(self, obj):
        return float(obj.weighted_amount)

    def validate_company(self, value):
        requester = self.context["request"].user
        if is_global_admin(requester):
            return value
        if value not in (None, requester.company):
            raise serializers.ValidationError("You can only manage sales projects within your own company.")
        return requester.company

    def validate(self, attrs):
        requester = self.context["request"].user
        if "company" not in attrs:
            attrs["company"] = requester.company if not is_global_admin(requester) else getattr(
                self.instance, "company", None
            )
        if attrs.get("company") is None:
            raise serializers.ValidationError(
                {"company": "Select a company for this sales project."}
            )

        stage = attrs.get("stage", getattr(self.instance, "stage", None))
        if "probability" not in attrs:
            if stage == "WON":
                attrs["probability"] = 100
            elif stage in ("LOST", "CANCELLED"):
                attrs["probability"] = 0
        return attrs
