import django_filters

from .models import Project


class ProjectFilter(django_filters.FilterSet):
    start_date_from = django_filters.DateFilter(field_name="start_date", lookup_expr="gte")
    start_date_to = django_filters.DateFilter(field_name="start_date", lookup_expr="lte")
    end_date_from = django_filters.DateFilter(field_name="end_date", lookup_expr="gte")
    end_date_to = django_filters.DateFilter(field_name="end_date", lookup_expr="lte")
    lob = django_filters.CharFilter(field_name="project_group", lookup_expr="icontains")

    class Meta:
        model = Project
        fields = [
            "status", "completion_status", "priority", "region", "client", "pmo",
            "sales_person", "lob_head", "project_type", "billing_entity", "contract_type",
            "project_group", "category_a", "budget_type",
            "start_date_from", "start_date_to", "end_date_from", "end_date_to", "lob",
        ]
