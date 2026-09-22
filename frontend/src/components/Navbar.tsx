import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${pad(d.getDate())}-${MONTHS[d.getMonth()]}-${pad(d.getFullYear() % 100)}`;
}

function formatTime(d: Date): string {
  const hours24 = d.getHours();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${pad(hours12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden sm:flex flex-col items-end leading-tight select-none mt-0.5">
      <span className="text-xs font-medium text-gray-700 tabular-nums">{formatTime(now)}</span>
      <span className="text-[10px] text-gray-400 tabular-nums">{formatDate(now)}</span>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="min-h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 py-2">
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.webp" alt="" className="h-7 w-auto" />
        <span className="font-semibold text-gray-800">Project Management</span>
      </Link>
      <div className="flex flex-col items-end">
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
        <LiveClock />
      </div>
    </header>
  );
}
