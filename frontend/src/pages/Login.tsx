import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <img src="/logo.webp" alt="" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold text-gray-800">Sign in to BT Projects</h1>
        </div>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          className="w-full mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          className="w-full mb-6 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-4 text-xs text-gray-400 text-center">
          Accounts are created by your company admin. Contact them for access.
        </p>
      </form>
    </div>
  );
}
