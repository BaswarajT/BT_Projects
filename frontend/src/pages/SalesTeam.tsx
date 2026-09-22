import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Trophy, Users2 } from "lucide-react";

import { getSalesTeamPerformance } from "../services/salesService";
import { ROLE_LABELS } from "../types";

export default function SalesTeam() {
  const { data, isLoading } = useQuery({
    queryKey: ["sales-team-performance"],
    queryFn: getSalesTeamPerformance,
  });

  const team = data?.team ?? [];
  const totalPipeline = team.reduce((sum, m) => sum + m.pipeline_value, 0);
  const totalWon = team.reduce((sum, m) => sum + m.won_value, 0);
  const avgWinRate = team.length
    ? Math.round(team.reduce((sum, m) => sum + m.win_rate, 0) / team.length)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Sales Team</h1>
        <p className="text-sm text-gray-500">Salesperson pipeline, wins, and target achievement.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-md mb-2 text-indigo-600 bg-indigo-50">
            <Users2 size={16} />
          </div>
          <p className="text-xs text-gray-500 mb-1">Team Members</p>
          <p className="text-2xl font-semibold text-gray-800">{team.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-md mb-2 text-blue-600 bg-blue-50">
            <Target size={16} />
          </div>
          <p className="text-xs text-gray-500 mb-1">Open Pipeline</p>
          <p className="text-2xl font-semibold text-gray-800">{totalPipeline.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-md mb-2 text-green-600 bg-green-50">
            <Trophy size={16} />
          </div>
          <p className="text-xs text-gray-500 mb-1">Won Revenue</p>
          <p className="text-2xl font-semibold text-gray-800">{totalWon.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-md mb-2 text-violet-600 bg-violet-50">
            <TrendingUp size={16} />
          </div>
          <p className="text-xs text-gray-500 mb-1">Avg Win Rate</p>
          <p className="text-2xl font-semibold text-gray-800">{avgWinRate}%</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading sales team...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3 w-48">Achievement</th>
                <th className="px-4 py-3">Pipeline</th>
                <th className="px-4 py-3">Active Deals</th>
                <th className="px-4 py-3">Won</th>
                <th className="px-4 py-3">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {team.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{m.full_name}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[m.role]} · {m.region || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{m.target?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3">
                    {m.achievement_pct === null ? (
                      <span className="text-xs text-gray-400">No target set</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.achievement_pct >= 100 ? "bg-green-500" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min(m.achievement_pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{m.achievement_pct}%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{m.pipeline_value.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">{m.active_deals}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {m.won_value.toLocaleString()} <span className="text-xs text-gray-400">({m.won_deals})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{m.win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {team.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">No sales team members yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
