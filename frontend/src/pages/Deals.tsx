import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSalesProjects, updateSalesProject } from "../services/salesService";
import { DEAL_STAGE_LABELS, type DealStage, type SalesProject } from "../types";

const columns: DealStage[] = [
  "NEW", "QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "HOLD", "WON", "LOST",
];

const columnAccent: Record<DealStage, string> = {
  NEW: "border-t-gray-400",
  QUALIFICATION: "border-t-blue-400",
  DISCOVERY: "border-t-cyan-400",
  PROPOSAL: "border-t-indigo-400",
  NEGOTIATION: "border-t-violet-400",
  HOLD: "border-t-amber-400",
  WON: "border-t-green-500",
  LOST: "border-t-red-400",
  CANCELLED: "border-t-gray-300",
};

function DealCard({ deal, onDragStart }: { deal: SalesProject; onDragStart: (e: React.DragEvent, deal: SalesProject) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      className="bg-white rounded-md border border-gray-200 p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-sm"
    >
      <p className="text-sm font-medium text-gray-800 mb-1">{deal.name}</p>
      <p className="text-xs text-gray-500 mb-2">{deal.client_name}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">
          {deal.currency} {Number(deal.amount).toLocaleString()}
        </span>
        <span className="text-[10px] text-gray-400">{deal.probability}%</span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{deal.salesperson_name}</p>
    </div>
  );
}

export default function Deals() {
  const queryClient = useQueryClient();
  const { data: deals, isLoading } = useQuery({
    queryKey: ["sales-projects", {}],
    queryFn: () => getSalesProjects(),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: DealStage }) => updateSalesProject(id, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-projects"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  function handleDragStart(e: React.DragEvent, deal: SalesProject) {
    e.dataTransfer.setData("dealId", String(deal.id));
  }

  function handleDrop(e: React.DragEvent, stage: DealStage) {
    e.preventDefault();
    const dealId = Number(e.dataTransfer.getData("dealId"));
    if (dealId) updateStageMutation.mutate({ id: dealId, stage });
  }

  const visibleDeals = deals?.filter((d) => d.stage !== "CANCELLED") ?? [];
  const totalPipeline = visibleDeals
    .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
    .reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Deals</h1>
          <p className="text-sm text-gray-500">Drag a card to move it through the pipeline.</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
          <p className="text-xs text-gray-500">Open pipeline</p>
          <p className="text-lg font-semibold text-gray-800">{totalPipeline.toLocaleString()}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading deals...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((stage) => {
            const stageDeals = visibleDeals.filter((d) => d.stage === stage);
            const stageTotal = stageDeals.reduce((sum, d) => sum + Number(d.amount), 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage)}
                className={`flex-shrink-0 w-64 bg-gray-100 rounded-lg p-3 border-t-4 ${columnAccent[stage]}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-700">{DEAL_STAGE_LABELS[stage]}</h2>
                  <span className="text-xs text-gray-400">{stageDeals.length}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{stageTotal.toLocaleString()}</p>
                {stageDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onDragStart={handleDragStart} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
