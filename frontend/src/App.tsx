import { Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import RequireRole from "./components/RequireRole";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Tasks from "./pages/Tasks";
import Kanban from "./pages/Kanban";
import Milestones from "./pages/Milestones";
import Timesheet from "./pages/Timesheet";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Companies from "./pages/Companies";
import GlobalAdmin from "./pages/GlobalAdmin";
import Clients from "./pages/Clients";
import SalesTeam from "./pages/SalesTeam";
import Deals from "./pages/Deals";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/milestones" element={<Milestones />} />
        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          element={
            <RequireRole roles={["GLOBAL_ADMIN", "SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "SALESPERSON"]} />
          }
        >
          <Route path="/clients" element={<Clients />} />
          <Route path="/sales-team" element={<SalesTeam />} />
          <Route path="/deals" element={<Deals />} />
        </Route>
        <Route element={<RequireRole roles={["GLOBAL_ADMIN", "SUPER_ADMIN", "ADMIN"]} />}>
          <Route path="/reports" element={<Reports />} />
        </Route>
        <Route element={<RequireRole roles={["GLOBAL_ADMIN", "SUPER_ADMIN"]} />}>
          <Route path="/users" element={<Users />} />
        </Route>
        <Route element={<RequireRole roles={["GLOBAL_ADMIN"]} />}>
          <Route path="/companies" element={<Companies />} />
          <Route path="/global-admin" element={<GlobalAdmin />} />
        </Route>
      </Route>
    </Routes>
  );
}
