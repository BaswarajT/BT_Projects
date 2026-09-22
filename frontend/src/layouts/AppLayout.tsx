import { useQuery } from "@tanstack/react-query";
import { Megaphone, ShieldAlert } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { getPlatformSettings } from "../services/globalAdminService";

export default function AppLayout() {
  const { user, isLoading, logout } = useAuth();

  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-public"],
    queryFn: getPlatformSettings,
    enabled: !!user,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isGlobalAdmin = user.role === "GLOBAL_ADMIN";

  if (platformSettings?.maintenance_mode && !isGlobalAdmin) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={22} />
          </div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Under maintenance</h1>
          <p className="text-sm text-gray-600">
            {platformSettings.maintenance_message || "BT Projects is undergoing scheduled maintenance."}
          </p>
          <button
            onClick={logout}
            className="mt-6 text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      {platformSettings?.announcement_banner && (
        <div className="bg-indigo-600 text-white text-sm px-4 py-2 flex items-center gap-2 flex-none">
          <Megaphone size={14} className="flex-none" />
          <span>{platformSettings.announcement_banner}</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
