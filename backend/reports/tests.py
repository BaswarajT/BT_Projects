from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from companies.models import Company
from projects.models import Milestone, Project, ProjectMember
from sales.models import SalesProject
from tasks.models import Task, TimeEntry
from users.models import User

from .analytics import count_weekdays, utilization_status


class DashboardSummaryTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="lead", password="StrongPassword123")
        self.client.force_authenticate(self.user)
        self.project = Project.objects.create(name="Demo", code="DEMO1", owner=self.user)
        ProjectMember.objects.create(project=self.project, user=self.user)
        Task.objects.create(project=self.project, title="Done task", created_by=self.user,
                             assigned_to=self.user, status="DONE")
        Task.objects.create(project=self.project, title="Open task", created_by=self.user,
                             assigned_to=self.user, status="TODO")
        Milestone.objects.create(project=self.project, title="Beta release", due_date="2026-12-01")

    def test_summary_shape(self):
        response = self.client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_projects"], 1)
        self.assertEqual(response.data["open_tasks"], 1)
        self.assertEqual(response.data["completed_tasks"], 1)
        self.assertEqual(len(response.data["project_progress"]), 1)
        self.assertEqual(response.data["project_progress"][0]["percent_complete"], 50)
        self.assertEqual(len(response.data["upcoming_milestones"]), 1)
        self.assertEqual(len(response.data["team_workload"]), 1)
        self.assertEqual(response.data["team_workload"][0]["open_task_count"], 1)


class AnalyticsHelperTest(APITestCase):
    def test_count_weekdays_full_week(self):
        # 2026-09-21 is a Monday, 2026-09-27 is a Sunday -> 5 weekdays.
        self.assertEqual(count_weekdays(date(2026, 9, 21), date(2026, 9, 27)), 5)

    def test_count_weekdays_single_weekday(self):
        self.assertEqual(count_weekdays(date(2026, 9, 21), date(2026, 9, 21)), 1)

    def test_count_weekdays_single_weekend_day(self):
        # 2026-09-26 is a Saturday.
        self.assertEqual(count_weekdays(date(2026, 9, 26), date(2026, 9, 26)), 0)

    def test_utilization_status_bench(self):
        self.assertEqual(utilization_status(0, has_active_assignments=False), "BENCH")

    def test_utilization_status_under_utilized_with_assignment(self):
        # 0% but still has an active (not-yet-started) assignment -> not bench.
        self.assertEqual(utilization_status(0, has_active_assignments=True), "UNDER_UTILIZED")

    def test_utilization_status_bands(self):
        self.assertEqual(utilization_status(49, True), "UNDER_UTILIZED")
        self.assertEqual(utilization_status(75, True), "UTILIZED")
        self.assertEqual(utilization_status(100, True), "UTILIZED")
        self.assertEqual(utilization_status(120, True), "OVER_ALLOCATED")


class ResourceReportsAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="ACME2")
        self.admin = User.objects.create_user(
            username="boss", password="StrongPassword123", company=self.company, role="SUPER_ADMIN"
        )
        self.busy = User.objects.create_user(
            username="busy_dev", password="StrongPassword123", company=self.company,
            role="MEMBER", weekly_capacity_hours=40,
        )
        self.idle = User.objects.create_user(
            username="idle_dev", password="StrongPassword123", company=self.company,
            role="MEMBER", weekly_capacity_hours=40,
        )
        self.project = Project.objects.create(name="Alpha", code="ALPHA1", owner=self.admin, company=self.company)
        self.task = Task.objects.create(
            project=self.project, title="Build thing", created_by=self.admin,
            assigned_to=self.busy, status="IN_PROGRESS", estimated_hours=10, due_date="2026-10-15",
        )
        TimeEntry.objects.create(task=self.task, user=self.busy, date="2026-09-21", hours=8)
        TimeEntry.objects.create(task=self.task, user=self.busy, date="2026-09-22", hours=8)

    def test_regular_member_forbidden(self):
        self.client.force_authenticate(self.busy)
        response = self.client.get("/api/reports/resource-utilization/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_tier_can_access_reports(self):
        # Admin has no user-management access, but DOES have company-wide project/
        # resource visibility, so these reports should be open to it too.
        admin_role_user = User.objects.create_user(
            username="ops_admin", password="StrongPassword123", company=self.company, role="ADMIN"
        )
        self.client.force_authenticate(admin_role_user)
        response = self.client.get("/api/reports/resource-utilization/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get("/api/reports/project-overrun/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_utilization_reflects_logged_hours_and_bench(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            "/api/reports/resource-utilization/",
            {"start_date": "2026-09-21", "end_date": "2026-09-21"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_username = {r["username"]: r for r in response.data["resources"]}

        # One weekday in range -> capacity = 40 * (1/5) = 8 hours; logged 8 -> 100%.
        self.assertEqual(by_username["busy_dev"]["capacity_hours"], 8.0)
        self.assertEqual(by_username["busy_dev"]["logged_hours"], 8.0)
        self.assertEqual(by_username["busy_dev"]["utilization_pct"], 100.0)
        self.assertEqual(by_username["busy_dev"]["status"], "UTILIZED")
        self.assertEqual(by_username["busy_dev"]["available_from"], date(2026, 10, 15))

        self.assertEqual(by_username["idle_dev"]["logged_hours"], 0.0)
        self.assertEqual(by_username["idle_dev"]["status"], "BENCH")

    def test_project_overrun_calculation(self):
        TimeEntry.objects.create(task=self.task, user=self.busy, date="2026-09-23", hours=20)
        # Total logged now 8+8+20 = 36 vs estimated 10 -> overrun.
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/reports/project-overrun/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_data = response.data["projects"][0]
        self.assertEqual(project_data["code"], "ALPHA1")
        self.assertEqual(project_data["estimated_hours"], 10.0)
        self.assertEqual(project_data["actual_hours"], 36.0)
        self.assertEqual(project_data["schedule_status"], "OVER_BUDGET")
        self.assertGreater(project_data["overrun_pct"], 0)


class SalesTeamPerformanceTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme", code="SALESPERF1")
        self.manager = User.objects.create_user(
            username="sales_mgr", password="StrongPassword123", company=self.company, role="SALES_MANAGER"
        )
        self.rep1 = User.objects.create_user(
            username="rep1", password="StrongPassword123", company=self.company, role="SALESPERSON",
            sales_target=1000000,
        )
        self.rep2 = User.objects.create_user(
            username="rep2", password="StrongPassword123", company=self.company, role="SALESPERSON",
        )
        client_record = Client.objects.create(company=self.company, name="Client X")
        SalesProject.objects.create(
            company=self.company, name="Won 1", client=client_record, salesperson=self.rep1,
            stage="WON", amount=400000, probability=100,
        )
        SalesProject.objects.create(
            company=self.company, name="Lost 1", client=client_record, salesperson=self.rep1,
            stage="LOST", amount=100000, probability=0,
        )
        SalesProject.objects.create(
            company=self.company, name="Open 1", client=client_record, salesperson=self.rep2,
            stage="NEW", amount=250000,
        )

    def test_sales_manager_sees_whole_team(self):
        self.client.force_authenticate(self.manager)
        response = self.client.get("/api/reports/sales-team-performance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_username = {r["username"]: r for r in response.data["team"]}

        self.assertEqual(by_username["rep1"]["won_value"], 400000.0)
        self.assertEqual(by_username["rep1"]["lost_value"], 100000.0)
        self.assertEqual(by_username["rep1"]["win_rate"], 50.0)
        self.assertEqual(by_username["rep1"]["achievement_pct"], 40.0)
        self.assertEqual(by_username["rep2"]["pipeline_value"], 250000.0)
        self.assertIsNone(by_username["rep2"]["achievement_pct"])

    def test_salesperson_sees_only_own_row(self):
        self.client.force_authenticate(self.rep1)
        response = self.client.get("/api/reports/sales-team-performance/")
        usernames = [r["username"] for r in response.data["team"]]
        self.assertEqual(usernames, ["rep1"])
