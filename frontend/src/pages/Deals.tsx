import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightCircle, CalendarClock, Plus, Search, Tag } from "lucide-react";

import Modal from "../components/Modal";
import DealForm from "../components/DealForm";
import {
  convertToProject,
  createSalesProject,
  getSalesProjects,
  updateSalesProject,
} from "../services/salesService";
import { DEAL_STAGE_LABELS, type DealStage, type SalesProject } from "../types";

function formatApiError(error: unknown): string {
  const data = (error as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  return Object.entries(data)
    .map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(" ") : messages;
      return field === "non_field_errors" ? text : `${field}: ${text}`;
    })
    .join(" ");
}

// Note: DealForm displays its own submit errors internally (it awaits onSubmit
// and catches), so this page doesn't need a separate formError surface for
// create/update — only the convert-to-project action (outside the form) needs one.

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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function DealCard({
  deal,
  onDragStart,
  onClick,
  onConvert,
  isConverting,
}: {
  deal: SalesProject;
  onDragStart: (e: React.DragEvent, deal: SalesProject) => void;
  onClick: () => void;
  onConvert: () => void;
  isConverting: boolean;
}) {
  const closeOverdue = deal.expected_close_date && deal.expected_close_date < todayISO();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onClick={onClick}
      className="bg-white rounded-md border border-gray-200 p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-sm"
    >
      <p className="text-sm font-medium text-gray-800 mb-1">{deal.name}</p>
      <p className="text-xs text-gray-500 mb-2">{deal.client_name}</p>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">
          {deal.currency} {Number(deal.amount).toLocaleString()}
        </span>
        <span className="text-[10px] text-gray-400">{deal.probability}%</span>
      </div>
      <p className="text-[11px] text-gray-400 mb-2">
        Weighted: {deal.currency} {deal.weighted_amount.toLocaleString()}
      </p>

      {deal.next_action && (
        <p className="text-[11px] text-gray-600 mb-1 line-clamp-1">→ {deal.next_action}</p>
      )}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
        {deal.expected_close_date && (
          <span className={`flex items-center gap-1 ${closeOverdue ? "text-red-500 font-medium" : ""}`}>
            <CalendarClock size={11} /> {deal.expected_close_date}
          </span>
        )}
        {deal.lead_source && (
          <span className="flex items-center gap-1">
            <Tag size={11} /> {deal.lead_source}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{deal.salesperson_name}</p>

      {deal.linked_project_code ? (
        <p className="text-[10px] text-indigo-600 mt-2">Linked: {deal.linked_project_code}</p>
      ) : deal.stage === "WON" ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConvert();
          }}
          disabled={isConverting}
          className="flex items-center gap-1 text-[11px] mt-2 px-2 py-1 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          <ArrowRightCircle size={12} /> Create Project
        </button>
      ) : null}
    </div>
  );
}

export default function Deals() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesProject | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const { data: deals, isLoading } = useQuery({
    queryKey: ["sales-projects", { search }],
    queryFn: () => getSalesProjects(search ? { search } : undefined),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["sales-projects"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  }

  const createMutation = useMutation({
    mutationFn: createSalesProject,
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SalesProject> }) => updateSalesProject(id, data),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: DealStage }) => updateSalesProject(id, { stage }),
    onSuccess: invalidate,
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => convertToProject(id),
    onSuccess: () => {
      invalidate();
      setConvertError(null);
    },
    onError: (error) => setConvertError(formatApiError(error)),
  });

  function openCreate() {
    setEditing(null);
    setIsModalOpen(true);
  }

  function openEdit(deal: SalesProject) {
    setEditing(deal);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
  }

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
  const weightedPipeline = visibleDeals
    .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
    .reduce((sum, d) => sum + d.weighted_amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Deals Projects</h1>
          <p className="text-sm text-gray-500">Drag a card to move it through the pipeline, or click to edit.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
            <p className="text-xs text-gray-500">Open pipeline</p>
            <p className="text-lg font-semibold text-gray-800">{totalPipeline.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
            <p className="text-xs text-gray-500">Weighted</p>
            <p className="text-lg font-semibold text-gray-800">{weightedPipeline.toLocaleString()}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus size={16} /> New Deal
          </button>
        </div>
      </div>

      <div className="relative mb-4 w-72">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search deals..."
          className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {convertError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {convertError}
        </div>
      )}

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
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDragStart={handleDragStart}
                    onClick={() => openEdit(deal)}
                    onConvert={() => convertMutation.mutate(deal.id)}
                    isConverting={convertMutation.isPending}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal title={editing ? "Edit Deal" : "New Deal"} onClose={closeModal} wide>
          <DealForm
            initial={editing ?? undefined}
            onCancel={closeModal}
            onSubmit={async (data) => {
              if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, data });
              } else {
                await createMutation.mutateAsync(data);
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
