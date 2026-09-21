import { Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import RequireRole from "./components/RequireRole";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Tasks from "./pages/Tasks";
import Kanban from "./pages/Kanban";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Companies from "./pages/Companies";

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
        <Route path="/profile" element={<Profile />} />
        <Route element={<RequireRole roles={["ADMIN", "SUPER_ADMIN"]} />}>
          <Route path="/users" element={<Users />} />
        </Route>
        <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
          <Route path="/companies" element={<Companies />} />
        </Route>
      </Route>
    </Routes>
  );
}
