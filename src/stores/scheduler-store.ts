import { create } from "zustand";

/**
 * Scheduler UI State Store
 *
 * This store handles UI-only state for the scheduler.
 * Server data is managed by TanStack Query.
 */

export interface DragPreview {
  sessionId: number;
  sourceBlockId: number;
  sourceDayOfWeek: number;
  targetBlockId: number | null;
  targetDayOfWeek: number | null;
}

export interface ConflictHighlight {
  blockId: number;
  dayOfWeek: number;
  type: "teacher" | "room" | "homeroom" | "a_level";
  message: string;
}

export interface PendingChange {
  sessionId: number;
  originalBlockId: number;
  originalDayOfWeek: number;
  newBlockId: number;
  newDayOfWeek: number;
  originalRoomId?: number;
  newRoomId?: number;
  originalTeacherId?: number;
  newTeacherId?: number;
  homeroomId?: number; // Track which homeroom this change belongs to
  // For new sessions from class bank
  isNew?: boolean;
  classId?: number;
  className?: string;
  classCode?: string;
  classGradeId?: number | null;
}

// Dynamic grade view mode - can be "all", "split", or "gradeX" where X is any grade number
export type GradeViewMode = string;

interface SchedulerState {
  // Selection state
  selectedSemesterId: number | null;
  selectedHomeroomId: number | null;
  selectedSessionId: number | null;

  // View mode for multi-grade homerooms
  gradeViewMode: GradeViewMode;

  // Drag state
  isDragging: boolean;
  dragPreview: DragPreview | null;

  // Conflict state
  conflictHighlights: ConflictHighlight[];

  // Loading state
  isValidating: boolean;

  // Pending changes (unsaved)
  pendingChanges: Map<number, PendingChange>;
  hasUnsavedChanges: boolean;

  // Actions
  setSelectedSemester: (semesterId: number | null) => void;
  setSelectedHomeroom: (homeroomId: number | null) => void;
  setSelectedSession: (sessionId: number | null) => void;
  setGradeViewMode: (mode: GradeViewMode) => void;

  startDrag: (
    preview: Omit<DragPreview, "targetBlockId" | "targetDayOfWeek">
  ) => void;
  updateDragTarget: (blockId: number | null, dayOfWeek: number | null) => void;
  endDrag: () => void;

  setConflictHighlights: (conflicts: ConflictHighlight[]) => void;
  clearConflictHighlights: () => void;

  setIsValidating: (isValidating: boolean) => void;

  addPendingChange: (change: PendingChange) => void;
  clearPendingChanges: () => void;
  removePendingChange: (sessionId: number) => void;
  getHomeroomsWithPendingChanges: () => Set<number>;

  reset: () => void;
}

const initialState = {
  selectedSemesterId: null,
  selectedHomeroomId: null,
  selectedSessionId: null,
  gradeViewMode: "all" as GradeViewMode,
  isDragging: false,
  dragPreview: null,
  conflictHighlights: [],
  isValidating: false,
  pendingChanges: new Map<number, PendingChange>(),
  hasUnsavedChanges: false,
};

export const useSchedulerStore = create<SchedulerState>((set) => ({
  ...initialState,

  setSelectedSemester: (semesterId) =>
    set({
      selectedSemesterId: semesterId,
      selectedHomeroomId: null,
      selectedSessionId: null,
    }),

  setSelectedHomeroom: (homeroomId) =>
    set({
      selectedHomeroomId: homeroomId,
      selectedSessionId: null,
    }),

  setSelectedSession: (sessionId) => set({ selectedSessionId: sessionId }),

  setGradeViewMode: (mode) => set({ gradeViewMode: mode }),

  startDrag: (preview) =>
    set({
      isDragging: true,
      dragPreview: {
        ...preview,
        targetBlockId: null,
        targetDayOfWeek: null,
      },
    }),

  updateDragTarget: (blockId, dayOfWeek) =>
    set((state) => ({
      dragPreview: state.dragPreview
        ? {
            ...state.dragPreview,
            targetBlockId: blockId,
            targetDayOfWeek: dayOfWeek,
          }
        : null,
    })),

  endDrag: () =>
    set({
      isDragging: false,
      dragPreview: null,
      conflictHighlights: [],
    }),

  setConflictHighlights: (conflicts) => set({ conflictHighlights: conflicts }),

  clearConflictHighlights: () => set({ conflictHighlights: [] }),

  setIsValidating: (isValidating) => set({ isValidating }),

  addPendingChange: (change) =>
    set((state) => {
      const newPending = new Map(state.pendingChanges);
      newPending.set(change.sessionId, change);
      return {
        pendingChanges: newPending,
        hasUnsavedChanges: true,
      };
    }),

  clearPendingChanges: () =>
    set({
      pendingChanges: new Map(),
      hasUnsavedChanges: false,
    }),

  removePendingChange: (sessionId) =>
    set((state) => {
      const newPending = new Map(state.pendingChanges);
      newPending.delete(sessionId);
      return {
        pendingChanges: newPending,
        hasUnsavedChanges: newPending.size > 0,
      };
    }),

  getHomeroomsWithPendingChanges: () => {
    const state = useSchedulerStore.getState();
    const homeroomIds = new Set<number>();
    for (const change of state.pendingChanges.values()) {
      if (change.homeroomId !== undefined) {
        homeroomIds.add(change.homeroomId);
      }
    }
    return homeroomIds;
  },

  reset: () => set(initialState),
}));
