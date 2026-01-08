"use client";

import { LeftSidebar, SchedulerGrid, RightSidebar } from "./_components";

export default function SchedulerPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <LeftSidebar />
      <SchedulerGrid />
      <RightSidebar />
    </div>
  );
}
