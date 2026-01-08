"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSchedulerStore } from "@/stores/scheduler-store";
import { ClassSessionCard, type SessionData } from "./ClassSessionCard";

interface SchedulerCellProps {
  blockId: number;
  dayOfWeek: number;
  sessions: SessionData[];
  homeroomId: number;
  gradeViewMode?: string;
  homeroomGrades?: { id: number; name: string }[];
  pendingSessionIds: Set<number>;
  onSessionRoomClick?: (session: SessionData) => void;
  viewOptions?: {
    showRoom: boolean;
    showGrade: boolean;
    showName: boolean;
    showCode: boolean;
    showTeacher: boolean;
  };
}

export function SchedulerCell({
  blockId,
  dayOfWeek,
  sessions,
  homeroomId,
  gradeViewMode = "all",
  homeroomGrades = [],
  pendingSessionIds,
  onSessionRoomClick,
  viewOptions,
}: SchedulerCellProps) {
  const {
    selectedSessionId,
    setSelectedSession,
    conflictHighlights,
    dragPreview,
    isDragging,
  } = useSchedulerStore();

  const cellId = `cell-${blockId}-${dayOfWeek}`;

  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: {
      type: "cell",
      blockId,
      dayOfWeek,
    },
  });

  // Check if this cell has a conflict highlight
  const cellConflicts = conflictHighlights.filter(
    (c) => c.blockId === blockId && c.dayOfWeek === dayOfWeek
  );
  const hasConflict = cellConflicts.length > 0;

  // Check if this is the drop target
  const isDropTarget =
    isDragging &&
    dragPreview?.targetBlockId === blockId &&
    dragPreview?.targetDayOfWeek === dayOfWeek;

  // Check if a session is being dragged from this cell
  const isSource =
    isDragging &&
    dragPreview?.sourceBlockId === blockId &&
    dragPreview?.sourceDayOfWeek === dayOfWeek;

  return (
    <div
      ref={setNodeRef}
      className={`
        relative min-h-20 p-1 border-r border-b border-zinc-200 dark:border-zinc-700
        transition-all duration-150
        ${
          sessions.length === 0 && !isOver
            ? "shadow-[inset_0_0_8px_rgba(239,68,68,0.15)] dark:shadow-[inset_0_0_8px_rgba(239,68,68,0.25)]"
            : ""
        }
        ${isOver ? "bg-blue-100 dark:bg-blue-900/30" : ""}
        ${isDropTarget && hasConflict ? "bg-red-100 dark:bg-red-900/30" : ""}
        ${
          isDropTarget && !hasConflict
            ? "bg-green-100 dark:bg-green-900/30"
            : ""
        }
        ${isSource ? "bg-zinc-100 dark:bg-zinc-800" : ""}
        ${
          !isOver && !isDropTarget && !isSource && sessions.length > 0
            ? "bg-white dark:bg-zinc-900"
            : ""
        }
        ${
          !isOver && !isDropTarget && !isSource && sessions.length === 0
            ? "bg-red-50/30 dark:bg-red-950/10"
            : ""
        }
      `}
    >
      {/* Sessions */}
      <div className="space-y-1">
        {sessions.map((session) => (
          <ClassSessionCard
            key={session.id}
            session={session}
            homeroomId={homeroomId}
            isSelected={selectedSessionId === session.id}
            onClick={() => setSelectedSession(session.id)}
            onRoomClick={() => onSessionRoomClick?.(session)}
            gradeViewMode={gradeViewMode}
            homeroomGrades={homeroomGrades}
            isPending={pendingSessionIds.has(session.id)}
            viewOptions={viewOptions}
          />
        ))}
      </div>

      {/* Drop indicator */}
      {isOver && !hasConflict && (
        <div className="absolute inset-1 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none" />
      )}

      {/* Conflict tooltip */}
      {hasConflict && isDropTarget && (
        <div className="absolute bottom-1 left-1 right-1 p-1.5 bg-red-500 text-white text-[10px] rounded shadow-lg z-10">
          {cellConflicts.map((c, i) => (
            <div key={i} className="truncate">
              ⚠️ {c.message}
            </div>
          ))}
        </div>
      )}

      {/* Empty cell indicator */}
      {sessions.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-700 text-xs">
          —
        </div>
      )}
    </div>
  );
}
