from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


class ProjectIQUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("ProjectIQ", {"fields": ("role", "phone", "avatar")}),
    )
    list_display = ("username", "email", "role", "is_staff")


admin.site.register(User, ProjectIQUserAdmin)
