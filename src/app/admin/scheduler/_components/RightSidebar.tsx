"use client";

import { trpc } from "@/lib/trpc-client";
import { useSchedulerStore } from "@/stores/scheduler-store";
import {
  X,
  Trash2,
  AlertTriangle,
  User,
  MapPin,
  Clock,
  BookOpen,
} from "lucide-react";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function RightSidebar() {
  const {
    selectedSessionId,
    selectedSemesterId,
    selectedHomeroomId,
    setSelectedSession,
    pendingChanges,
    addPendingChange,
  } = useSchedulerStore();

  // Fetch scheduler data to get session details
  const { data: schedulerData, refetch } =
    trpc.scheduler.getSchedulerData.useQuery(
      {
        semesterId: selectedSemesterId ?? 0,
        homeroomId: selectedHomeroomId ?? 0,
      },
      {
        enabled: !!selectedSemesterId && !!selectedHomeroomId,
      }
    );

  // Fetch rooms
  const { data: rooms } = trpc.scheduler.getRooms.useQuery();

  // Fetch teachers
  const { data: teachers } = trpc.scheduler.getTeachers.useQuery();

  // Get the session and check for pending changes
  const selectedSession = schedulerData?.sessions.find(
    (s) => s.id === selectedSessionId
  );

  const pendingChange = selectedSessionId
    ? pendingChanges.get(selectedSessionId)
    : null;

  // Current values (considering pending changes)
  const currentRoomId = pendingChange?.newRoomId ?? selectedSession?.roomId;
  const currentTeacherId =
    pendingChange?.newTeacherId ?? selectedSession?.teachers[0]?.id;

  // Validate for conflicts
  const { data: validationResult } =
    trpc.scheduler.validateSessionMove.useQuery(
      {
        classSessionId: selectedSessionId ?? 0,
        targetBlockId: selectedSession?.blockId ?? 0,
        targetDayOfWeek: selectedSession?.dayOfWeek ?? 1,
        targetRoomId: selectedSession?.roomId ?? 0,
        semesterId: selectedSemesterId ?? 0,
      },
      {
        enabled: !!selectedSession && !!selectedSemesterId,
      }
    );

  // Mutations
  const removeMutation = trpc.scheduler.removeClassSession.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedSession(null);
    },
  });

  const handleRemove = () => {
    if (!selectedSessionId) return;
    if (
      confirm("Are you sure you want to remove this session from the schedule?")
    ) {
      removeMutation.mutate({ classSessionId: selectedSessionId });
    }
  };

  const handleRoomChange = (newRoomId: number) => {
    if (!selectedSession) return;
    addPendingChange({
      sessionId: selectedSession.id,
      originalBlockId:
        pendingChange?.originalBlockId ?? selectedSession.blockId,
      originalDayOfWeek:
        pendingChange?.originalDayOfWeek ?? selectedSession.dayOfWeek,
      newBlockId: pendingChange?.newBlockId ?? selectedSession.blockId,
      newDayOfWeek: pendingChange?.newDayOfWeek ?? selectedSession.dayOfWeek,
      originalRoomId: pendingChange?.originalRoomId ?? selectedSession.roomId,
      newRoomId,
      originalTeacherId:
        pendingChange?.originalTeacherId ?? selectedSession.teachers[0]?.id,
      newTeacherId:
        pendingChange?.newTeacherId ?? selectedSession.teachers[0]?.id,
    });
  };

  const handleTeacherChange = (newTeacherId: number) => {
    if (!selectedSession) return;
    addPendingChange({
      sessionId: selectedSession.id,
      originalBlockId:
        pendingChange?.originalBlockId ?? selectedSession.blockId,
      originalDayOfWeek:
        pendingChange?.originalDayOfWeek ?? selectedSession.dayOfWeek,
      newBlockId: pendingChange?.newBlockId ?? selectedSession.blockId,
      newDayOfWeek: pendingChange?.newDayOfWeek ?? selectedSession.dayOfWeek,
      originalRoomId: pendingChange?.originalRoomId ?? selectedSession.roomId,
      newRoomId: pendingChange?.newRoomId ?? selectedSession.roomId,
      originalTeacherId:
        pendingChange?.originalTeacherId ?? selectedSession.teachers[0]?.id,
      newTeacherId,
    });
  };

  if (!selectedSession) {
    return (
      <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-zinc-500 dark:text-zinc-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a class session to view details</p>
          </div>
        </div>
      </aside>
    );
  }

  const conflicts = validationResult?.conflicts ?? [];
  const hasRoomChanged =
    pendingChange?.newRoomId !== undefined &&
    pendingChange.newRoomId !== pendingChange.originalRoomId;
  const hasTeacherChanged =
    pendingChange?.newTeacherId !== undefined &&
    pendingChange.newTeacherId !== pendingChange.originalTeacherId;

  return (
    <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Session Details
        </h3>
        <button
          type="button"
          onClick={() => setSelectedSession(null)}
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Class Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
              {selectedSession.classCode}
            </span>
          </div>
          <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {selectedSession.className}
          </h4>
        </div>

        {/* Schedule Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Clock size={14} />
            <span>
              {selectedSession.blockName} •{" "}
              {DAY_NAMES[selectedSession.dayOfWeek - 1]}
            </span>
          </div>
        </div>

        {/* Room Selector */}
        <div className="space-y-2">
          <label
            htmlFor="room-select"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
          >
            <MapPin size={14} />
            Room{" "}
            {hasRoomChanged && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                (changed)
              </span>
            )}
          </label>
          <select
            id="room-select"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            value={currentRoomId ?? ""}
            onChange={(e) => handleRoomChange(Number(e.target.value))}
          >
            <option value="">Select room...</option>
            {rooms?.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.type.typeName})
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Selector */}
        <div className="space-y-2">
          <label
            htmlFor="teacher-select"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
          >
            <User size={14} />
            Teacher{" "}
            {hasTeacherChanged && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                (changed)
              </span>
            )}
          </label>
          <select
            id="teacher-select"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            value={currentTeacherId ?? ""}
            onChange={(e) => handleTeacherChange(Number(e.target.value))}
          >
            <option value="">Select teacher...</option>
            {teachers?.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>

        {/* Original Teachers */}
        {selectedSession.teachers.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <h5 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Current Assignment
            </h5>
            <div className="space-y-1">
              {selectedSession.teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <User size={14} />
                  <span>{teacher.name}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    ({teacher.role})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <h5 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle size={14} />
              Conflicts ({conflicts.length})
            </h5>
            <div className="space-y-1">
              {conflicts.map((conflict) => (
                <div
                  key={`${conflict.type}-${conflict.message}`}
                  className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300"
                >
                  <span className="font-medium capitalize">
                    {conflict.type}:
                  </span>{" "}
                  {conflict.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleRemove}
          disabled={removeMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
          {removeMutation.isPending ? "Removing..." : "Remove from Schedule"}
        </button>
      </div>
    </aside>
  );
}
