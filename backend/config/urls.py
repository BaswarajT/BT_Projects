from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from companies.views import CompanyViewSet
from clients.views import ClientViewSet
from projects.views import MilestoneViewSet, ProjectViewSet, ProjectMemberViewSet
from sales.views import SalesProjectViewSet
from tasks.views import TaskDependencyViewSet, TaskViewSet, TimeEntryViewSet
from comments.views import CommentViewSet
from notifications.views import NotificationViewSet
from files.views import AttachmentViewSet
from reports.views import (
    DashboardSummaryView,
    ProjectOverrunView,
    ResourceUtilizationView,
    SalesTeamPerformanceView,
)
from users.views import ConfirmOtpView, MeView, RequestOtpView, TeamDirectoryView, UserManagementViewSet

router = DefaultRouter()
router.register("companies", CompanyViewSet, basename="company")
router.register("admin/users", UserManagementViewSet, basename="admin-user")
router.register("clients", ClientViewSet, basename="client")
router.register("projects", ProjectViewSet, basename="project")
router.register("project-members", ProjectMemberViewSet, basename="project-member")
router.register("milestones", MilestoneViewSet, basename="milestone")
router.register("sales-projects", SalesProjectViewSet, basename="sales-project")
router.register("tasks", TaskViewSet, basename="task")
router.register("task-dependencies", TaskDependencyViewSet, basename="task-dependency")
router.register("time-entries", TimeEntryViewSet, basename="time-entry")
router.register("comments", CommentViewSet, basename="comment")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("attachments", AttachmentViewSet, basename="attachment")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view()),
    path("api/token/refresh/", TokenRefreshView.as_view()),
    path("api/me/", MeView.as_view()),
    path("api/team-directory/", TeamDirectoryView.as_view()),
    path("api/verify/<str:purpose>/request/", RequestOtpView.as_view()),
    path("api/verify/<str:purpose>/confirm/", ConfirmOtpView.as_view()),
    path("api/dashboard/summary/", DashboardSummaryView.as_view()),
    path("api/reports/resource-utilization/", ResourceUtilizationView.as_view()),
    path("api/reports/project-overrun/", ProjectOverrunView.as_view()),
    path("api/reports/sales-team-performance/", SalesTeamPerformanceView.as_view()),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
