"use client";

import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { trpc } from "@/lib/trpc-client";
import { useSchedulerStore } from "@/stores/scheduler-store";
import { SchedulerCell } from "./SchedulerCell";
import { ClassSessionCard, type SessionData } from "./ClassSessionCard";
import { ClassBank } from "./ClassBank";
import { ResourceScheduleModal } from "./ResourceScheduleModal";
import { RoomSelectorModal } from "./RoomSelectorModal";
import { useCallback, useEffect, useState, useRef } from "react";
import { Loader2, Eye, ChevronDown } from "lucide-react";

export function SchedulerGrid() {
  const {
    selectedSemesterId,
    selectedHomeroomId,
    gradeViewMode,
    setGradeViewMode,
    startDrag,
    updateDragTarget,
    endDrag,
    setConflictHighlights,
    clearConflictHighlights,
    setIsValidating,
    dragPreview,
    pendingChanges,
    addPendingChange,
    clearPendingChanges,
    hasUnsavedChanges,
  } = useSchedulerStore();

  const [draggedSession, setDraggedSession] = useState<SessionData | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [allConflicts, setAllConflicts] = useState<
    Array<{
      sessionId: number;
      sessionName: string;
      type: string;
      message: string;
      resourceType?: "room" | "teacher";
      resourceId?: number;
      resourceName?: string;
    }>
  >([]);
  const [allWarnings, setAllWarnings] = useState<
    Array<{
      sessionId: number;
      sessionName: string;
      type: string;
      message: string;
    }>
  >([]);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceModalData, setResourceModalData] = useState<{
    type: "room" | "teacher";
    id: number;
    name: string;
  } | null>(null);
  const [roomSelectorOpen, setRoomSelectorOpen] = useState(false);
  const [roomSelectorSession, setRoomSelectorSession] =
    useState<SessionData | null>(null);

  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [viewOptions, setViewOptions] = useState({
    showRoom: true,
    showGrade: true,
    showName: true,
    showCode: true,
    showTeacher: true,
  });
  const viewOptionsRef = useRef<HTMLDivElement>(null);

  // Close view options when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        viewOptionsRef.current &&
        !viewOptionsRef.current.contains(event.target as Node)
      ) {
        setViewOptionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const trpcUtils = trpc.useUtils();

  // Fetch scheduler data
  const {
    data: schedulerData,
    isLoading,
    error,
    refetch,
  } = trpc.scheduler.getSchedulerData.useQuery(
    {
      semesterId: selectedSemesterId ?? 0,
      homeroomId: selectedHomeroomId ?? 0,
    },
    {
      enabled: !!selectedSemesterId && !!selectedHomeroomId,
      staleTime: 0, // Always fetch fresh data
      refetchOnMount: true,
    }
  );

  // Validation query (manual trigger)
  const validateMutation = trpc.scheduler.validateSessionMove.useQuery(
    {
      classSessionId: dragPreview?.sessionId ?? 0,
      targetBlockId: dragPreview?.targetBlockId ?? 0,
      targetDayOfWeek: dragPreview?.targetDayOfWeek ?? 1,
      targetRoomId: draggedSession?.roomId ?? 0,
      semesterId: selectedSemesterId ?? 0,
    },
    {
      enabled:
        !!dragPreview?.sessionId &&
        !!dragPreview?.targetBlockId &&
        !!dragPreview?.targetDayOfWeek &&
        !!draggedSession?.roomId &&
        !!selectedSemesterId,
      refetchOnWindowFocus: false,
    }
  );

  // Move mutation
  const moveMutation = trpc.scheduler.moveClassSession.useMutation({
    onSuccess: async () => {
      console.log("✅ Move mutation succeeded, invalidating cache...");
      await trpcUtils.scheduler.getSchedulerData.invalidate();
      console.log("✅ Cache invalidated after move");
      setErrorMessage(null);
    },
    onError: (err) => {
      setErrorMessage(err.message);
      // Clear error after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Update room mutation
  const updateRoomMutation = trpc.scheduler.updateSessionRoom.useMutation({
    onSuccess: async () => {
      console.log("✅ Update room mutation succeeded, invalidating cache...");
      await trpcUtils.scheduler.getSchedulerData.invalidate();
      console.log("✅ Cache invalidated after room update");
    },
    onError: (err) => {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Create session mutation (for class bank drops)
  const createSessionMutation = trpc.scheduler.createClassSession.useMutation({
    onSuccess: async () => {
      console.log(
        "✅ Create session mutation succeeded, invalidating cache..."
      );
      await trpcUtils.scheduler.getSchedulerData.invalidate();
      console.log("✅ Cache invalidated after create");
      setErrorMessage(null);
    },
    onError: (err) => {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Update conflict highlights when validation result changes
  useEffect(() => {
    if (validateMutation.data) {
      setIsValidating(false);
      if (!validateMutation.data.valid) {
        setConflictHighlights(
          validateMutation.data.conflicts.map((c) => ({
            blockId: dragPreview?.targetBlockId ?? 0,
            dayOfWeek: dragPreview?.targetDayOfWeek ?? 1,
            type: c.type as "teacher" | "room" | "homeroom" | "a_level",
            message: c.message,
          }))
        );
      } else {
        clearConflictHighlights();
      }
    }
  }, [
    validateMutation.data,
    dragPreview?.targetBlockId,
    dragPreview?.targetDayOfWeek,
    setConflictHighlights,
    clearConflictHighlights,
    setIsValidating,
  ]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current as
        | {
            type: "session";
            sessionId: number;
            blockId: number;
            dayOfWeek: number;
          }
        | {
            type: "class-bank-item";
            classId: number;
            className: string;
            classCode: string;
            gradeId: number | null;
          };

      if (!data || !schedulerData) return;

      // Handle existing session drag
      if ("sessionId" in data) {
        const session = schedulerData.sessions.find(
          (s) => s.id === data.sessionId
        );
        if (session) {
          setDraggedSession(session);
          startDrag({
            sessionId: data.sessionId,
            sourceBlockId: data.blockId,
            sourceDayOfWeek: data.dayOfWeek,
          });
        }
      }
      // Handle class bank item drag
      else if (data.type === "class-bank-item") {
        // Create a temporary session object for preview
        setDraggedSession({
          id: -1, // Temporary ID
          classId: data.classId,
          classCode: data.classCode,
          className: data.className,
          classGradeId: data.gradeId,
          blockId: 0,
          blockName: "",
          dayOfWeek: 0,
          roomId: 0,
          roomName: "No Room",
          semesterId: selectedSemesterId ?? 0,
          teachers: [],
        });
      }
    },
    [schedulerData, startDrag, selectedSemesterId]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (over?.data.current?.type === "cell") {
        const { blockId, dayOfWeek } = over.data.current as {
          blockId: number;
          dayOfWeek: number;
        };
        updateDragTarget(blockId, dayOfWeek);
        setIsValidating(true);
      } else {
        updateDragTarget(null, null);
        clearConflictHighlights();
      }
    },
    [updateDragTarget, setIsValidating, clearConflictHighlights]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over, active } = event;
      const activeData = active.data.current as
        | {
            type: "session";
            sessionId: number;
            blockId: number;
            dayOfWeek: number;
          }
        | {
            type: "class-bank-item";
            classId: number;
            className: string;
            classCode: string;
            gradeId: number | null;
          };

      if (
        over?.data.current?.type === "cell" &&
        draggedSession &&
        selectedSemesterId &&
        selectedHomeroomId &&
        schedulerData // Ensure schedulerData is available
      ) {
        const { blockId, dayOfWeek } = over.data.current as {
          blockId: number;
          dayOfWeek: number;
        };

        // Handle class bank item drop (create new session)
        if (activeData?.type === "class-bank-item") {
          // Smart Room Selection: Find first available room in this block/day
          const occupiedRoomIds = new Set<number>();

          // Check existing sessions (considering pending moves)
          schedulerData.sessions.forEach((s) => {
            const pendingChange = pendingChanges.get(s.id);
            const effectiveBlockId = pendingChange
              ? pendingChange.newBlockId
              : s.blockId;
            const effectiveDay = pendingChange
              ? pendingChange.newDayOfWeek
              : s.dayOfWeek;
            const effectiveRoomId = pendingChange
              ? pendingChange.newRoomId ?? s.roomId
              : s.roomId;

            if (effectiveBlockId === blockId && effectiveDay === dayOfWeek) {
              occupiedRoomIds.add(effectiveRoomId);
            }
          });

          // Check new pending sessions
          pendingChanges.forEach((p) => {
            if (
              p.isNew &&
              p.newBlockId === blockId &&
              p.newDayOfWeek === dayOfWeek &&
              p.newRoomId
            ) {
              occupiedRoomIds.add(p.newRoomId);
            }
          });

          // Find first free room
          let targetRoomId = schedulerData.rooms[0]?.id;
          for (const room of schedulerData.rooms) {
            if (!occupiedRoomIds.has(room.id)) {
              targetRoomId = room.id;
              break;
            }
          }

          if (targetRoomId) {
            // Generate a temporary negative ID for the new session
            const tempId = -Date.now();

            // Add to pending changes as a new session
            addPendingChange({
              sessionId: tempId,
              originalBlockId: 0,
              originalDayOfWeek: 0,
              newBlockId: blockId,
              newDayOfWeek: dayOfWeek,
              newRoomId: targetRoomId,
              homeroomId: selectedHomeroomId ?? undefined,
              isNew: true,
              classId: activeData.classId,
              className: activeData.className,
              classCode: activeData.classCode,
              classGradeId: activeData.gradeId,
            });
          }
        }
        // Handle existing session move
        else if (
          "sessionId" in activeData &&
          (blockId !== draggedSession.blockId ||
            dayOfWeek !== draggedSession.dayOfWeek)
        ) {
          // Check if we have conflicts
          if (validateMutation.data?.valid === false) {
            // Show error but don't prevent the move - just highlight conflicts
            setErrorMessage(
              "⚠️ Conflicts detected: " +
                validateMutation.data.conflicts.map((c) => c.message).join("; ")
            );
            setTimeout(() => setErrorMessage(null), 8000);
          }

          // Add to pending changes (don't save yet)
          addPendingChange({
            sessionId: draggedSession.id,
            originalBlockId: draggedSession.blockId,
            originalDayOfWeek: draggedSession.dayOfWeek,
            newBlockId: blockId,
            newDayOfWeek: dayOfWeek,
            homeroomId: selectedHomeroomId ?? undefined,
          });
        }
      }

      setDraggedSession(null);
      endDrag();
    },
    [
      draggedSession,
      selectedSemesterId,
      selectedHomeroomId,
      schedulerData,
      validateMutation.data,
      addPendingChange,
      endDrag,
      pendingChanges,
    ]
  );

  // Set default view mode based on homeroom type
  useEffect(() => {
    if (schedulerData?.homeroom) {
      if (schedulerData.homeroom.grades.length > 1) {
        // Multi-grade: default to split view
        setGradeViewMode("split");
      } else {
        // Single-grade: default to all (no filter)
        setGradeViewMode("all");
      }
    }
  }, [schedulerData?.homeroom.id, setGradeViewMode]);

  // Group sessions by block and day, applying pending changes and grade filtering
  const sessionsByCell = useCallback(() => {
    // console.log("🔄 sessionsByCell recomputing, sessions count:", schedulerData?.sessions.length ?? 0);
    if (!schedulerData) return new Map<string, SessionData[]>();

    const map = new Map<string, SessionData[]>();

    // Add existing sessions with pending changes applied
    for (const session of schedulerData.sessions) {
      // Filter based on grade view mode
      if (gradeViewMode === "all" || gradeViewMode === "split") {
        // Show all classes (shared and grade-specific)
        // "All" = Aggregated view for single grade, "Split" = Split visual view for multi-grade
        // No filtering needed
      } else if (gradeViewMode === "shared") {
        // Shared mode: only show classes without a grade
        if (session.classGradeId !== null) {
          continue;
        }
      } else {
        // Individual grade modes: extract grade number from mode (e.g., "grade10" -> 10)
        const gradeNum = gradeViewMode.replace("grade", "");
        const targetGrade = schedulerData.homeroom.grades.find((g) =>
          g.name.includes(gradeNum)
        );

        // Only show classes for this specific grade or shared classes (null gradeId)
        if (
          session.classGradeId !== targetGrade?.id &&
          session.classGradeId !== null
        ) {
          continue;
        }
      }

      // Check if this session has a pending change
      const pendingChange = pendingChanges.get(session.id);

      const blockId = pendingChange?.newBlockId ?? session.blockId;
      const dayOfWeek = pendingChange?.newDayOfWeek ?? session.dayOfWeek;
      const roomId = pendingChange?.newRoomId ?? session.roomId;

      // Get updated room name if room changed
      const roomName = pendingChange?.newRoomId
        ? schedulerData.rooms.find((r) => r.id === pendingChange.newRoomId)
            ?.name ?? session.roomName
        : session.roomName;

      const key = `${blockId}-${dayOfWeek}`;
      const existing = map.get(key) ?? [];
      existing.push({
        ...session,
        blockId,
        dayOfWeek,
        roomId,
        roomName,
      });
      map.set(key, existing);

      // Debug: Check if teachers exist
      if (session.teachers && session.teachers.length > 0) {
        console.log(
          `Session ${session.classCode} has ${session.teachers.length} teachers:`,
          session.teachers
        );
      }
    }

    // Add new pending sessions (from class bank)
    for (const change of pendingChanges.values()) {
      if (change.isNew && change.classId) {
        // Filter based on grade view mode
        if (gradeViewMode === "all" || gradeViewMode === "split") {
          // Show all classes (shared and grade-specific)
          // No filtering needed
        } else if (gradeViewMode === "shared") {
          // Shared mode: only show classes without a grade
          if (change.classGradeId !== null) {
            continue;
          }
        } else {
          // Individual grade modes: extract grade number from mode
          const gradeNum = gradeViewMode.replace("grade", "");
          const targetGrade = schedulerData.homeroom.grades.find((g) =>
            g.name.includes(gradeNum)
          );

          // Only show classes for this specific grade or shared classes (null gradeId)
          if (
            change.classGradeId !== targetGrade?.id &&
            change.classGradeId !== null
          ) {
            continue;
          }
        }

        const key = `${change.newBlockId}-${change.newDayOfWeek}`;
        const existing = map.get(key) ?? [];

        // Find room name
        const room = schedulerData.rooms.find((r) => r.id === change.newRoomId);

        existing.push({
          id: change.sessionId,
          classId: change.classId,
          classCode: change.classCode ?? "",
          className: change.className ?? "",
          classGradeId: change.classGradeId ?? null,
          blockId: change.newBlockId,
          blockName:
            schedulerData.blocks.find((b) => b.id === change.newBlockId)
              ?.name ?? "",
          dayOfWeek: change.newDayOfWeek,
          roomId: change.newRoomId ?? 0,
          roomName: room?.name ?? "No Room",
          semesterId: selectedSemesterId ?? 0,
          teachers: [],
        });
        map.set(key, existing);
      }
    }

    return map;
  }, [schedulerData, pendingChanges, gradeViewMode, selectedSemesterId]);

  const sessionsMap = sessionsByCell();

  // Validate all pending changes to collect conflicts and warnings
  const validateAllChanges = useCallback(async () => {
    if (!schedulerData || pendingChanges.size === 0) {
      setAllConflicts([]);
      setAllWarnings([]);
      return;
    }

    const conflicts: Array<{
      sessionId: number;
      sessionName: string;
      type: string;
      message: string;
      resourceType?: "room" | "teacher";
      resourceId?: number;
      resourceName?: string;
    }> = [];

    const warnings: Array<{
      sessionId: number;
      sessionName: string;
      type: string;
      message: string;
    }> = [];

    for (const change of pendingChanges.values()) {
      if (!selectedSemesterId) continue;

      let result;
      let sessionName = "";
      let currentRoomId = 0;

      try {
        if (change.isNew && change.classId) {
          sessionName = change.classCode
            ? `${change.classCode} - ${change.className}`
            : change.className || "New Class";
          currentRoomId = change.newRoomId ?? schedulerData.rooms[0]?.id ?? 0;

          result = await trpcUtils.scheduler.validateSessionCreate.fetch({
            classId: change.classId,
            targetBlockId: change.newBlockId,
            targetDayOfWeek: change.newDayOfWeek,
            targetRoomId: currentRoomId,
            semesterId: selectedSemesterId,
          });
        } else {
          const session = schedulerData.sessions.find(
            (s) => s.id === change.sessionId
          );
          if (!session) continue;

          sessionName = `${session.classCode} - ${session.className}`;
          currentRoomId = session.roomId;

          result = await trpcUtils.scheduler.validateSessionMove.fetch({
            classSessionId: change.sessionId,
            targetBlockId: change.newBlockId,
            targetDayOfWeek: change.newDayOfWeek,
            targetRoomId: change.newRoomId ?? session.roomId,
            semesterId: selectedSemesterId,
          });
        }

        if (result && !result.valid) {
          result.conflicts.forEach((c) => {
            // Parse resource info from conflict
            let resourceType: "room" | "teacher" | undefined;
            let resourceId: number | undefined;
            let resourceName: string | undefined;

            if (c.type === "room") {
              resourceType = "room";
              resourceId = change.newRoomId ?? currentRoomId;
              resourceName = schedulerData.rooms.find(
                (r) => r.id === resourceId
              )?.name;
            } else if (c.type === "teacher" && c.relatedSessionId) {
              resourceType = "teacher";
              // Try to find teacher from related session
              const relatedSession = schedulerData.sessions.find(
                (s) => s.id === c.relatedSessionId
              );
              if (
                relatedSession?.teachers?.length &&
                relatedSession.teachers.length > 0
              ) {
                resourceId = relatedSession.teachers[0].id;
                resourceName = relatedSession.teachers[0].name;
              }
            }

            conflicts.push({
              sessionId: change.sessionId,
              sessionName: sessionName,
              type: c.type,
              message: c.message,
              resourceType,
              resourceId,
              resourceName,
            });
          });
        }

        // Collect warnings
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((w) => {
            warnings.push({
              sessionId: change.sessionId,
              sessionName: sessionName,
              type: w.type,
              message: w.message,
            });
          });
        }
      } catch {
        // Ignore validation errors
      }
    }

    setAllConflicts(conflicts);
    setAllWarnings(warnings);
  }, [pendingChanges, schedulerData, selectedSemesterId, trpcUtils]);

  // Debounced validation to avoid hammering the server
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateAllChanges();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [validateAllChanges]);

  const hasConflicts = allConflicts.length > 0;

  // Handle room change for a session
  const handleRoomChange = useCallback(
    (sessionId: number, newRoomId: number) => {
      // Check if this is an existing session
      const session = schedulerData?.sessions.find((s) => s.id === sessionId);

      if (session) {
        // Existing session - add/update pending change
        addPendingChange({
          sessionId: session.id,
          originalBlockId: session.blockId,
          originalDayOfWeek: session.dayOfWeek,
          newBlockId: session.blockId,
          newDayOfWeek: session.dayOfWeek,
          originalRoomId: session.roomId,
          newRoomId: newRoomId,
          homeroomId: selectedHomeroomId ?? undefined,
        });
      } else {
        // New session (from class bank) - update the pending change
        const existingPendingChange = pendingChanges.get(sessionId);
        if (existingPendingChange && existingPendingChange.isNew) {
          addPendingChange({
            ...existingPendingChange,
            newRoomId: newRoomId,
          });
        }
      }
    },
    [schedulerData, selectedHomeroomId, addPendingChange, pendingChanges]
  );

  // Batch save mutation
  const batchSaveMutation = trpc.scheduler.batchSaveChanges.useMutation({
    onSuccess: async () => {
      console.log("✅ Batch save mutation succeeded, invalidating cache...");
      await trpcUtils.scheduler.getSchedulerData.invalidate();
      console.log("✅ Cache invalidated after batch save");
      setErrorMessage(null);
    },
    onError: (err) => {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Handle save all pending changes
  const handleSaveChanges = useCallback(async () => {
    if (pendingChanges.size === 0 || !selectedSemesterId || !schedulerData)
      return;

    const pendingArray = Array.from(pendingChanges.values());
    console.log(
      "💾 Starting save with",
      pendingArray.length,
      "pending changes"
    );
    setIsSaving(true);

    // Clear pending changes BEFORE save to prevent duplicate cards
    clearPendingChanges();
    clearConflictHighlights();

    try {
      // Prepare batch payload - can generate multiple operations per change
      const payload = pendingArray.flatMap((change) => {
        const operations: Array<
          | {
              type: "create";
              sessionId: number;
              blockId: number;
              dayOfWeek: number;
              roomId: number;
              semesterId: number;
              classId: number;
              homeroomId?: number;
            }
          | {
              type: "move";
              sessionId: number;
              blockId: number;
              dayOfWeek: number;
              roomId: number;
            }
          | {
              type: "update_room";
              sessionId: number;
              roomId: number;
            }
          | {
              type: "update_teacher";
              sessionId: number;
              teacherId: number;
            }
        > = [];

        if (change.isNew && change.classId) {
          operations.push({
            type: "create" as const,
            sessionId: -1, // Ignored
            blockId: change.newBlockId,
            dayOfWeek: change.newDayOfWeek,
            roomId: change.newRoomId ?? schedulerData.rooms[0]?.id ?? 0,
            semesterId: selectedSemesterId,
            classId: change.classId,
            homeroomId: selectedHomeroomId ?? undefined,
          });
          return operations;
        }

        const session = schedulerData.sessions.find(
          (s) => s.id === change.sessionId
        );
        const currentRoomId = session ? session.roomId : 0;

        // Move (includes room change if specified)
        if (
          change.newBlockId !== change.originalBlockId ||
          change.newDayOfWeek !== change.originalDayOfWeek
        ) {
          operations.push({
            type: "move" as const,
            sessionId: change.sessionId,
            blockId: change.newBlockId,
            dayOfWeek: change.newDayOfWeek,
            roomId: change.newRoomId ?? currentRoomId,
          });
        }
        // Room update only (no move)
        else if (
          change.newRoomId !== undefined &&
          change.newRoomId !== change.originalRoomId
        ) {
          operations.push({
            type: "update_room" as const,
            sessionId: change.sessionId,
            roomId: change.newRoomId,
          });
        }

        // Teacher update (independent of move/room)
        if (
          change.newTeacherId !== undefined &&
          change.newTeacherId !== change.originalTeacherId
        ) {
          operations.push({
            type: "update_teacher" as const,
            sessionId: change.sessionId,
            teacherId: change.newTeacherId,
          });
        }

        return operations;
      });

      if (payload.length > 0) {
        await batchSaveMutation.mutateAsync({ changes: payload });
      }

      // Invalidate and refetch data to get latest state
      console.log("🔄 Starting cache invalidation and refetch...");
      // Invalidate GLOBALLY to ensure no cache key mismatches
      try {
        await trpcUtils.scheduler.getSchedulerData.invalidate();
        console.log("✅ Global cache invalidated");
      } catch (e) {
        console.error("❌ Failed to invalidate cache:", e);
      }

      console.log("🔄 Refetching data...");
      const result = await refetch();
      console.log(
        "✅ Refetch complete, sessions count:",
        result.data?.sessions.length ?? 0
      );

      // Pending changes already cleared before save to prevent duplicate display
    } catch (err) {
      const error = err as Error;
      setErrorMessage(`Failed to save changes: ${error.message}`);
      setTimeout(() => setErrorMessage(null), 5000);

      // On error, we need to restore the UI somehow or let user retry
      // For now, just refetch to get back to a consistent state
      await refetch();
    } finally {
      setIsSaving(false);
    }
  }, [
    pendingChanges,
    selectedSemesterId,
    schedulerData,
    batchSaveMutation,
    trpcUtils,
    refetch,
    clearPendingChanges,
    clearConflictHighlights,
  ]);

  // No selection state
  if (!selectedSemesterId || !selectedHomeroomId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Select a Homeroom
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Choose a semester and homeroom from the sidebar to view the schedule
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center text-red-500">
          <p className="font-medium">Error loading schedule</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!schedulerData) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {schedulerData.homeroom.name}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {schedulerData.homeroom.sectionName} •{" "}
                {schedulerData.homeroom.grades.map((g) => g.name).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Options Dropdown */}
              <div className="relative" ref={viewOptionsRef}>
                <button
                  type="button"
                  onClick={() => setViewOptionsOpen(!viewOptionsOpen)}
                  className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Eye size={16} />
                  View
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${
                      viewOptionsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {viewOptionsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 p-2 z-50">
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={viewOptions.showRoom}
                          onChange={(e) =>
                            setViewOptions({
                              ...viewOptions,
                              showRoom: e.target.checked,
                            })
                          }
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          Room
                        </span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={viewOptions.showGrade}
                          onChange={(e) =>
                            setViewOptions({
                              ...viewOptions,
                              showGrade: e.target.checked,
                            })
                          }
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          Grade
                        </span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={viewOptions.showName}
                          onChange={(e) =>
                            setViewOptions({
                              ...viewOptions,
                              showName: e.target.checked,
                            })
                          }
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          Full Name
                        </span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={viewOptions.showCode}
                          onChange={(e) =>
                            setViewOptions({
                              ...viewOptions,
                              showCode: e.target.checked,
                            })
                          }
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          Code
                        </span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={viewOptions.showTeacher}
                          onChange={(e) =>
                            setViewOptions({
                              ...viewOptions,
                              showTeacher: e.target.checked,
                            })
                          }
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          Teacher
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              {hasUnsavedChanges && !isSaving && (
                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  {pendingChanges.size} unsaved change
                  {pendingChanges.size !== 1 ? "s" : ""}
                </span>
              )}
              {hasUnsavedChanges && !isSaving && (
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={moveMutation.isPending || hasConflicts}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  title={hasConflicts ? "Resolve conflicts before saving" : ""}
                >
                  {moveMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              )}
              {hasUnsavedChanges && !isSaving && (
                <button
                  type="button"
                  onClick={clearPendingChanges}
                  disabled={moveMutation.isPending}
                  className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Discard
                </button>
              )}
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="shrink-0 px-4 py-2 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              ⚠️ {errorMessage}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="grid border-l border-t border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
            style={{
              gridTemplateColumns: `120px repeat(${schedulerData.days.length}, 1fr)`,
              gridTemplateRows: `48px repeat(${schedulerData.blocks.length}, minmax(80px, auto))`,
            }}
          >
            {/* Empty top-left corner */}
            <div className="bg-zinc-100 dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Block
            </div>

            {/* Day headers */}
            {schedulerData.days.map((day) => (
              <div
                key={day.dayOfWeek}
                className="bg-zinc-100 dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {day.name}
              </div>
            ))}

            {/* Blocks and cells */}
            {schedulerData.blocks.map((block) => (
              <div key={`block-row-${block.id}`} className="contents">
                {/* Block label */}
                <div className="bg-zinc-50 dark:bg-zinc-850 border-r border-b border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center p-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {block.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {new Date(block.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {new Date(block.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Day cells */}
                {schedulerData.days.map((day) => {
                  const cellKey = `${block.id}-${day.dayOfWeek}`;
                  const cellSessions = sessionsMap.get(cellKey) ?? [];
                  const pendingSessionIds = new Set(
                    Array.from(pendingChanges.keys())
                  );

                  return (
                    <SchedulerCell
                      key={cellKey}
                      blockId={block.id}
                      dayOfWeek={day.dayOfWeek}
                      sessions={cellSessions}
                      homeroomId={schedulerData.homeroom.id}
                      gradeViewMode={gradeViewMode}
                      homeroomGrades={schedulerData.homeroom.grades}
                      pendingSessionIds={pendingSessionIds}
                      onSessionRoomClick={(session) => {
                        setRoomSelectorSession(session);
                        setRoomSelectorOpen(true);
                      }}
                      viewOptions={viewOptions}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Class Bank */}
        <ClassBank />

        {/* Warnings Section */}
        {allWarnings.length > 0 && (
          <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {allWarnings.length} Warning
                  {allWarnings.length !== 1 ? "s" : ""}
                </h3>
              </div>
              <div className="space-y-2">
                {allWarnings.map((warning, index) => (
                  <div
                    key={`${warning.sessionId}-${warning.type}-${index}`}
                    className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        !
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-0.5">
                        {warning.sessionName}
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        {warning.message}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-wide">
                        {warning.type.replace("_", " ")} warning
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                ℹ️ These are warnings only - you can still save changes
              </p>
            </div>
          </div>
        )}

        {/* Conflicts Section */}
        {allConflicts.length > 0 && (
          <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {allConflicts.length} Conflict
                  {allConflicts.length !== 1 ? "s" : ""} Detected
                </h3>
              </div>
              <div className="space-y-2">
                {allConflicts.map((conflict, index) => (
                  <div
                    key={`${conflict.sessionId}-${conflict.type}-${index}`}
                    className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        !
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-0.5">
                        {conflict.sessionName}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300">
                        {conflict.message}
                      </div>
                      <div className="text-[10px] text-red-600 dark:text-red-400 mt-1 uppercase tracking-wide">
                        {conflict.type.replace("_", " ")} conflict
                      </div>
                    </div>
                    {conflict.resourceType &&
                      conflict.resourceId &&
                      conflict.resourceName && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              conflict.resourceType &&
                              conflict.resourceId &&
                              conflict.resourceName
                            ) {
                              setResourceModalData({
                                type: conflict.resourceType,
                                id: conflict.resourceId,
                                name: conflict.resourceName,
                              });
                              setResourceModalOpen(true);
                            }
                          }}
                          className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          View Room&apos;s Schedule
                        </button>
                      )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                ⚠️ Resolve all conflicts before saving changes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedSession && (
          <div className="w-48">
            <ClassSessionCard
              session={draggedSession}
              homeroomId={schedulerData.homeroom.id}
              isDraggingDisabled
              gradeViewMode={gradeViewMode}
              homeroomGrades={schedulerData.homeroom.grades}
            />
          </div>
        )}
      </DragOverlay>

      {/* Resource Schedule Modal */}
      {resourceModalData && (
        <ResourceScheduleModal
          isOpen={resourceModalOpen}
          onClose={() => {
            setResourceModalOpen(false);
            setResourceModalData(null);
          }}
          resourceType={resourceModalData.type}
          resourceId={resourceModalData.id}
          resourceName={resourceModalData.name}
          semesterId={selectedSemesterId ?? 0}
        />
      )}

      {/* Room Selector Modal */}
      {roomSelectorSession && (
        <RoomSelectorModal
          isOpen={roomSelectorOpen}
          onClose={() => {
            setRoomSelectorOpen(false);
            setRoomSelectorSession(null);
          }}
          onSelectRoom={(roomId) => {
            handleRoomChange(roomSelectorSession.id, roomId);
            setRoomSelectorOpen(false);
            setRoomSelectorSession(null);
          }}
          currentRoomId={roomSelectorSession.roomId}
          sessionName={`${roomSelectorSession.classCode} - ${roomSelectorSession.className}`}
          blockName={roomSelectorSession.blockName}
          dayName={
            schedulerData?.days.find(
              (d) => d.dayOfWeek === roomSelectorSession.dayOfWeek
            )?.name ?? ""
          }
        />
      )}
    </DndContext>
  );
}
