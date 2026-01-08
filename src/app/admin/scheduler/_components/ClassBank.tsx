"use client";

import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { useSchedulerStore } from "@/stores/scheduler-store";

interface ClassBankItemProps {
  classItem: {
    id: number;
    code: string;
    name: string;
    gradeId: number | null;
    gradeName: string | null;
  };
}

function ClassBankItem({ classItem }: ClassBankItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `class-${classItem.id}`,
    data: {
      type: "class-bank-item",
      classId: classItem.id,
      className: classItem.name,
      classCode: classItem.code,
      gradeId: classItem.gradeId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
        rounded-lg cursor-grab active:cursor-grabbing
        hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md
        transition-all duration-150
        ${isDragging ? "opacity-50" : "opacity-100"}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {classItem.name}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {classItem.code}
          </div>
        </div>
        {classItem.gradeName && (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
            {classItem.gradeName}
          </span>
        )}
      </div>
    </div>
  );
}

export function ClassBank() {
  const { selectedSemesterId, selectedHomeroomId } = useSchedulerStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");

  // Fetch all classes for the semester (not just scheduled ones)
  const { data: allClasses, isLoading } = trpc.scheduler.getAllClasses.useQuery(
    {
      semesterId: selectedSemesterId ?? 0,
      homeroomId: selectedHomeroomId ?? 0,
    },
    {
      enabled: !!selectedSemesterId && !!selectedHomeroomId,
    }
  );

  // Get unique grades from the classes
  const availableGrades = useMemo(() => {
    if (!allClasses) return [];
    const grades = new Map<number, string>();
    allClasses.forEach((cls) => {
      if (cls.gradeId && cls.gradeName) {
        grades.set(cls.gradeId, cls.gradeName);
      }
    });
    return Array.from(grades.entries()).map(([id, name]) => ({ id, name }));
  }, [allClasses]);

  // Filter classes based on search and grade filter
  const filteredClasses = useMemo(() => {
    if (!allClasses) return [];

    return allClasses.filter((cls) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        cls.name.toLowerCase().includes(searchLower) ||
        cls.code.toLowerCase().includes(searchLower);

      // Grade filter
      const matchesGrade = gradeFilter === "all" || cls.gradeId === gradeFilter;

      return matchesSearch && matchesGrade;
    });
  }, [allClasses, searchQuery, gradeFilter]);

  if (!selectedSemesterId || !selectedHomeroomId) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Class Bank
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Drag classes to schedule
          </span>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={gradeFilter}
            onChange={(e) =>
              setGradeFilter(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Grades</option>
            {availableGrades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>

        {/* Classes Grid */}
        {isLoading ? (
          <div className="text-center py-8 text-sm text-zinc-500">
            Loading classes...
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-500">
            No classes found
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
            {filteredClasses.map((cls) => (
              <ClassBankItem key={cls.id} classItem={cls} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
