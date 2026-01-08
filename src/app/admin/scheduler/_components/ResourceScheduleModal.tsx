"use client";

import { trpc } from "@/lib/trpc-client";
import { X, Loader2 } from "lucide-react";
import { ClassSessionCard } from "./ClassSessionCard";

interface ResourceScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: "room" | "teacher";
  resourceId: number;
  resourceName: string;
  semesterId: number;
}

export function ResourceScheduleModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  semesterId,
}: ResourceScheduleModalProps) {
  // Fetch the resource's schedule
  const { data: scheduleData, isLoading } =
    trpc.scheduler.getResourceSchedule.useQuery(
      {
        resourceType,
        resourceId,
        semesterId,
      },
      {
        enabled: isOpen && !!resourceId && !!semesterId,
      }
    );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {resourceType === "room" ? "📍 Room" : "👤 Teacher"} Schedule
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {resourceName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {!isLoading && scheduleData && (
              <div
                className="grid border-l border-t border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
                style={{
                  gridTemplateColumns: `120px repeat(${scheduleData.days.length}, 1fr)`,
                  gridTemplateRows: `48px repeat(${scheduleData.blocks.length}, minmax(80px, auto))`,
                }}
              >
                {/* Empty top-left corner */}
                <div className="bg-zinc-100 dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Block
                </div>

                {/* Day headers */}
                {scheduleData.days.map((day) => (
                  <div
                    key={day.dayOfWeek}
                    className="bg-zinc-100 dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-700 dark:text-zinc-300 px-2"
                  >
                    <span className="truncate">{day.name}</span>
                  </div>
                ))}

                {/* Block rows */}
                {scheduleData.blocks.map((block) => (
                  <div key={block.id} className="contents">
                    {/* Block label */}
                    <div className="bg-zinc-100 dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center p-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <div className="font-medium truncate w-full text-center">
                        {block.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate w-full text-center">
                        {new Date(block.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        -
                        {new Date(block.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Cells for each day */}
                    {scheduleData.days.map((day) => {
                      const cellKey = `${block.id}-${day.dayOfWeek}`;
                      const cellSessions = scheduleData.sessions.filter(
                        (s) =>
                          s.blockId === block.id &&
                          s.dayOfWeek === day.dayOfWeek
                      );

                      return (
                        <div
                          key={cellKey}
                          className="min-h-20 p-1 border-r border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        >
                          <div className="space-y-1">
                            {cellSessions.map((session) => (
                              <ClassSessionCard
                                key={session.id}
                                session={session}
                                homeroomId={0}
                                isDraggingDisabled={true}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !scheduleData && (
              <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
                No schedule data available
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
