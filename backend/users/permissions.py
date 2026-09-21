from rest_framework.permissions import BasePermission


def is_super_admin(user):
    return bool(user and user.is_authenticated and user.role == "SUPER_ADMIN")


def is_company_admin(user):
    return bool(user and user.is_authenticated and user.role == "ADMIN")


def is_admin_or_super_admin(user):
    return is_super_admin(user) or is_company_admin(user)


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_super_admin(request.user)


class IsAdminOrSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin_or_super_admin(request.user)
