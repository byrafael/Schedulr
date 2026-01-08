"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useSchedulerStore } from "@/stores/scheduler-store";
import { GripVertical } from "lucide-react";

export interface SessionData {
  id: number;
  classId: number;
  classCode: string;
  className: string;
  classGradeId: number | null;
  blockId: number;
  blockName: string;
  dayOfWeek: number;
  roomId: number;
  roomName: string;
  semesterId: number;
  teachers: { id: number; name: string; role: string }[];
}

export interface ClassSessionCardProps {
  session: SessionData;
  homeroomId: number;
  onClick?: () => void;
  onRoomClick?: () => void;
  isSelected?: boolean;
  isDraggingDisabled?: boolean;
  gradeViewMode?: string;
  homeroomGrades?: { id: number; name: string }[];
  isPending?: boolean;
  viewOptions?: {
    showRoom: boolean;
    showGrade: boolean;
    showName: boolean;
    showCode: boolean;
    showTeacher: boolean;
  };
}

export function ClassSessionCard({
  session,
  homeroomId,
  onClick,
  onRoomClick,
  isSelected,
  isDraggingDisabled,
  gradeViewMode = "all",
  homeroomGrades = [],
  isPending = false,
  viewOptions = {
    showRoom: true,
    showGrade: true,
    showName: true,
    showCode: true,
    showTeacher: true,
  },
}: ClassSessionCardProps) {
  const { conflictHighlights, isDragging: isAnyDragging } = useSchedulerStore();

  // Check if this session's cell has a conflict
  const hasConflict = conflictHighlights.some(
    (c) => c.blockId === session.blockId && c.dayOfWeek === session.dayOfWeek
  );

  // Determine grade name if this is a grade-specific class
  const getGradeName = () => {
    if (!session.classGradeId) return null;
    const grade = homeroomGrades.find((g) => g.id === session.classGradeId);
    return grade?.name;
  };

  const gradeName = getGradeName();

  // Get grade-specific colors for split mode
  const getGradeColor = () => {
    if (gradeViewMode !== "split" || !gradeName) {
      return {
        border: "border-zinc-200 dark:border-zinc-700",
        bg: "bg-white dark:bg-zinc-800",
        hover: "hover:border-zinc-300 dark:hover:border-zinc-600",
      };
    }

    if (gradeName.includes("10")) {
      return {
        border: "border-purple-300 dark:border-purple-700",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        hover: "hover:border-purple-400 dark:hover:border-purple-600",
      };
    }

    if (gradeName.includes("11")) {
      return {
        border: "border-emerald-300 dark:border-emerald-700",
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        hover: "hover:border-emerald-400 dark:hover:border-emerald-600",
      };
    }

    return {
      border: "border-zinc-200 dark:border-zinc-700",
      bg: "bg-white dark:bg-zinc-800",
      hover: "hover:border-zinc-300 dark:hover:border-zinc-600",
    };
  };

  const gradeColors = getGradeColor();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `session-${session.id}`,
      data: {
        type: "session",
        sessionId: session.id,
        homeroomId,
        semesterId: session.semesterId,
        blockId: session.blockId,
        dayOfWeek: session.dayOfWeek,
      },
      disabled: isDraggingDisabled,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isDraggingDisabled ? { ...attributes, ...listeners } : {})}
      className={`
        group relative flex items-start gap-1 p-2 rounded-lg border text-left
        transition-all duration-150
        ${
          !isDraggingDisabled
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-pointer"
        }
        ${isDragging ? "z-50 shadow-lg" : ""}
        ${
          isPending
            ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-pulse"
            : isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500"
            : hasConflict
            ? "border-red-400 bg-red-50 dark:bg-red-900/30"
            : `${gradeColors.border} ${gradeColors.bg} ${gradeColors.hover}`
        }
        ${isAnyDragging && !isDragging ? "pointer-events-none" : ""}
      `}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-selected={isSelected}
    >
      {/* Drag indicator icon (visual only) */}
      {!isDraggingDisabled && (
        <div className="shrink-0 p-0.5 -ml-1 text-zinc-400 pointer-events-none">
          <GripVertical size={14} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {(viewOptions.showCode ||
          (viewOptions.showGrade && gradeViewMode === "split")) && (
          <div className="flex items-center gap-1">
            {viewOptions.showCode && (
              <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">
                {session.classCode}
              </span>
            )}
            {/* Grade badge for split view */}
            {viewOptions.showGrade &&
              gradeViewMode === "split" &&
              gradeName && (
                <span
                  className={`px-1 py-0.5 text-[9px] font-semibold rounded ${
                    gradeName.includes("10")
                      ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200"
                      : gradeName.includes("11")
                      ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {gradeName.replace(/\D/g, "")}
                </span>
              )}
          </div>
        )}
        {viewOptions.showName && (
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
            {session.className}
          </div>
        )}
        {viewOptions.showRoom && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRoomClick?.();
            }}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate text-left underline decoration-dotted"
            title="Click to change room"
          >
            📍 {session.roomName}
          </button>
        )}
        {viewOptions.showTeacher && session.teachers.length > 0 && (
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
            👤 {session.teachers.map((t) => t.name).join(", ")}
          </div>
        )}
      </div>

      {/* Conflict indicator */}
      {hasConflict && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}

      {/* Pending changes indicator */}
      {isPending && !hasConflict && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}
