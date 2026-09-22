import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.webp" alt="" className="h-7 w-auto" />
        <span className="font-semibold text-gray-800">BT Project Management</span>
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <Link to="/profile" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <span className="w-7 h-7 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 text-xs font-semibold flex-none">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (user.first_name?.[0] ?? user.username[0]).toUpperCase()
              )}
            </span>
            {user.username}
          </Link>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
