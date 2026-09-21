from rest_framework.permissions import BasePermission

# Role hierarchy (highest to lowest):
#   GLOBAL_ADMIN  - platform-wide. Sees/manages every company, every project, everyone.
#                   Only role that can create companies or assign GLOBAL_ADMIN/SUPER_ADMIN.
#   SUPER_ADMIN   - full control within their own company: sees every project/task/user
#                   in the company, manages users, assigns ADMIN and below.
#   ADMIN         - same company-wide project/task visibility as Super Admin, but no
#                   user-management access at all (can't create/edit/deactivate users).
#   (below)       - PROJECT_MANAGER / TEAM_LEAD / MEMBER / CLIENT / VIEWER: scoped to
#                   projects they're a member of or created.


def is_global_admin(user):
    return bool(user and user.is_authenticated and user.role == "GLOBAL_ADMIN")


def is_super_admin(user):
    return bool(user and user.is_authenticated and user.role == "SUPER_ADMIN")


def is_admin(user):
    return bool(user and user.is_authenticated and user.role == "ADMIN")


def has_company_wide_visibility(user):
    """Global Admin, Super Admin, and Admin all see every project/task in their scope."""
    return is_global_admin(user) or is_super_admin(user) or is_admin(user)


def can_manage_users(user):
    """Only Global Admin and Super Admin can create/edit/deactivate other users."""
    return is_global_admin(user) or is_super_admin(user)


ROLE_RANK = {
    "GLOBAL_ADMIN": 6,
    "SUPER_ADMIN": 5,
    "ADMIN": 4,
    "PROJECT_MANAGER": 3,
    "TEAM_LEAD": 2,
    "MEMBER": 1,
    "CLIENT": 1,
    "VIEWER": 0,
}


def max_assignable_role_rank(requester):
    """The highest role rank a requester is allowed to hand out to someone else."""
    if is_global_admin(requester):
        return ROLE_RANK["GLOBAL_ADMIN"]
    if is_super_admin(requester):
        return ROLE_RANK["ADMIN"]
    return -1


class IsGlobalAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_global_admin(request.user)


class CanManageUsers(BasePermission):
    def has_permission(self, request, view):
        return can_manage_users(request.user)
