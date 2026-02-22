import { cn } from "@/lib/utils";

type Status = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
type ConditionRating = "RED" | "AMBER" | "GREEN";
type ReplacementPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const statusStyles: Record<Status, string> = {
  PLANNED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
  ABANDONED: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600",
};

const statusDotStyles: Record<Status, string> = {
  PLANNED: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  ABANDONED: "bg-gray-400",
};

const statusLabels: Record<Status, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
};

const conditionStyles: Record<ConditionRating, string> = {
  RED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
  AMBER: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
  GREEN: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
};

const priorityStyles: Record<ReplacementPriority, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50",
  LOW: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        statusStyles[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDotStyles[status])} />
      {statusLabels[status]}
    </span>
  );
}

export function ConditionBadge({ rating }: { rating: ConditionRating }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        conditionStyles[rating]
      )}
    >
      {rating}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ReplacementPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        priorityStyles[priority]
      )}
    >
      {priority}
    </span>
  );
}
