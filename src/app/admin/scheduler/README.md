# Admin Scheduler

The Admin Scheduler is a drag-and-drop scheduling interface for school administrators to assign classes to time blocks for each homeroom.

## Route

```
/admin/scheduler
```

## Component Structure

```
src/app/admin/scheduler/
├── page.tsx                    # Main page component
└── _components/
    ├── index.ts               # Barrel exports
    ├── LeftSidebar.tsx        # Semester selector & homeroom tree
    ├── SchedulerGrid.tsx      # Main drag-and-drop grid
    ├── SchedulerCell.tsx      # Individual grid cell (droppable)
    ├── ClassSessionCard.tsx   # Draggable class session card
    └── RightSidebar.tsx       # Session inspector panel
```

## Key Files

| File                              | Purpose                       |
| --------------------------------- | ----------------------------- |
| `src/server/routers/scheduler.ts` | tRPC procedures for scheduler |
| `src/stores/scheduler-store.ts`   | Zustand store for UI state    |
| `src/lib/trpc-client.tsx`         | tRPC client configuration     |
| `src/lib/admin.ts`                | Admin user ID configuration   |

## API Contracts (tRPC)

### `scheduler.getSemesters`

Returns all semesters for the dropdown.

**Returns:** `{ id: number, name: string, startDate: Date, endDate: Date }[]`

---

### `scheduler.getSectionTree`

Returns hierarchical tree of sections → grades → homerooms.

**Input:**

```ts
{
  semesterId: number;
}
```

**Returns:**

```ts
{
  id: number;
  name: string;
  grades: {
    id: number;
    name: string;
    homerooms: {
      id: number;
      name: string;
      teacherName: string | null;
    }
    [];
  }
  [];
}
[];
```

---

### `scheduler.getSchedulerData`

Main data fetch for the scheduler grid.

**Input:**

```ts
{ semesterId: number, homeroomId: number }
```

**Returns:**

```ts
{
  homeroom: {
    id: number;
    name: string;
    sectionId: number;
    sectionName: string;
    grades: {
      id: number;
      name: string;
    }
    [];
  }
  blocks: {
    id: number;
    name: string;
    startTime: Date;
    endTime: Date;
    isEarly: boolean;
    isLate: boolean;
  }
  [];
  days: {
    dayOfWeek: number;
    name: string;
  }
  [];
  rooms: {
    id: number;
    name: string;
    typeName: string;
  }
  [];
  sessions: {
    id: number;
    classId: number;
    classCode: string;
    className: string;
    blockId: number;
    blockName: string;
    dayOfWeek: number;
    roomId: number;
    roomName: string;
    semesterId: number;
    teachers: {
      id: number;
      name: string;
      role: string;
    }
    [];
  }
  [];
}
```

---

### `scheduler.validateSessionMove`

Validates a session move without side effects.

**Input:**

```ts
{
  classSessionId: number;
  targetBlockId: number;
  targetDayOfWeek: number; // 1-5 (Mon-Fri)
  targetRoomId: number;
  semesterId: number;
}
```

**Returns:**

```ts
{
  valid: boolean;
  conflicts: {
    type: "teacher" | "room" | "homeroom" | "a_level";
    message: string;
    relatedSessionId?: number;
  }[];
}
```

---

### `scheduler.moveClassSession`

Moves a session to a new block/day/room. Re-validates server-side.

**Input:** Same as `validateSessionMove`

**Returns:** Updated session data

**Errors:** Throws if conflicts exist

---

### `scheduler.removeClassSession`

Removes a session from the schedule.

**Input:**

```ts
{
  classSessionId: number;
}
```

---

### `scheduler.updateSessionRoom`

Updates only the room for a session.

**Input:**

```ts
{ classSessionId: number, roomId: number }
```

## State Management

### TanStack Query (Server State)

- All data fetching
- Mutations with automatic cache invalidation

### Zustand (UI State Only)

- `selectedSemesterId` - Currently selected semester
- `selectedHomeroomId` - Currently selected homeroom
- `selectedSessionId` - Currently selected session in inspector
- `isDragging` - Drag operation in progress
- `dragPreview` - Source/target info during drag
- `conflictHighlights` - Active conflict indicators

## Conflict Detection

The scheduler checks for four types of conflicts:

1. **Teacher Conflicts** - Teacher already teaching/has duty at target time
2. **Room Conflicts** - Room already booked for class or duty
3. **Homeroom Conflicts** - Students would have overlapping classes
4. **A-Level Conflicts** - A-level group scheduling conflicts (if applicable)

All conflicts include specific, actionable messages:

> "Mr. Gómez is already teaching Physics in Block 3 (Mon)."

## Drag & Drop

Uses `@dnd-kit` with the following payload:

```ts
{
  type: "session";
  sessionId: number;
  homeroomId: number;
  semesterId: number;
  blockId: number;
  dayOfWeek: number;
}
```

**Behavior:**

1. On drag start: Store source position
2. On drag over: Validate target position, show conflicts
3. On drag end: If valid → mutate; if invalid → snap back with error

## Setup

### 1. Configure Admin Users

Edit `src/lib/admin.ts` and add Clerk user IDs:

```ts
export const ADMIN_USER_IDS: string[] = [
  "user_2abc123def456",
  // Add more admin user IDs
];
```

### 2. Environment Variables

Ensure `.env` has:

```
DATABASE_URL="mysql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
```

### 3. Database Migration

```bash
bunx prisma migrate dev
```

### 4. Run Development Server

```bash
bun dev
```

## Known Limitations

1. **View By Teacher/Room** - Toggle buttons are present but not yet implemented (marked as "Coming soon")
2. **Duplicate Session** - Inspector action not yet implemented
3. **A-Level Group Conflicts** - Basic implementation; may need refinement for complex scenarios
4. **Schedule Versioning** - Not implemented; all changes affect live schedule
5. **Undo/Redo** - Not implemented; changes are immediate

## Performance

- Data is loaded per-homeroom (not entire school)
- Grid uses CSS Grid for efficient layout
- Optimistic UI updates with rollback on error
- Sessions are grouped by cell for O(1) lookup

## Accessibility

- Keyboard navigation via @dnd-kit defaults
- ARIA labels on interactive elements
- Focus management on sidebar selection
- Error messages are visible and actionable
