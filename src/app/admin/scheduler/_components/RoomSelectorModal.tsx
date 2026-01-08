"use client";

import { X } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { useState } from "react";

interface RoomSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (roomId: number) => void;
  currentRoomId: number;
  sessionName: string;
  blockName: string;
  dayName: string;
}

export function RoomSelectorModal({
  isOpen,
  onClose,
  onSelectRoom,
  currentRoomId,
  sessionName,
  blockName,
  dayName,
}: RoomSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all rooms
  const { data: rooms } = trpc.scheduler.getRooms.useQuery(undefined, {
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const filteredRooms =
    rooms?.filter(
      (room) =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.type.typeName.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md flex flex-col pointer-events-auto max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Change Room
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {sessionName} • {dayName} {blockName}
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

          {/* Search */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                No rooms found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      onSelectRoom(room.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      room.id === currentRoomId
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="font-medium text-sm">{room.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {room.type.typeName}
                    </div>
                  </button>
                ))}
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
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
