"use client";

import { trpc } from "@/lib/trpc-client";
import { useSchedulerStore } from "@/stores/scheduler-store";
import { ChevronDown, ChevronRight, Home, Users, DoorOpen } from "lucide-react";
import { useState, useEffect } from "react";

interface TreeNode {
  id: number;
  name: string;
  homerooms?: { id: number; name: string; teacherName: string | null }[];
}

interface SectionNode {
  id: number;
  name: string;
  grades: TreeNode[];
}

type ViewMode = "homeroom" | "teacher" | "room";

export function LeftSidebar() {
  const {
    selectedSemesterId,
    selectedHomeroomId,
    setSelectedSemester,
    setSelectedHomeroom,
    gradeViewMode,
    setGradeViewMode,
    getHomeroomsWithPendingChanges,
  } = useSchedulerStore();

  const [viewMode, setViewMode] = useState<ViewMode>("homeroom");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set());

  const { data: semesters, isLoading: semestersLoading } =
    trpc.scheduler.getSemesters.useQuery();

  const { data: sectionTree, isLoading: treeLoading } =
    trpc.scheduler.getSectionTree.useQuery(
      { semesterId: selectedSemesterId ?? 0 },
      { enabled: !!selectedSemesterId }
    );

  // Set default semester (active or closest to now)
  useEffect(() => {
    if (
      semestersLoading ||
      !semesters ||
      semesters.length === 0 ||
      selectedSemesterId
    )
      return;

    const now = new Date();

    // 1. Try to find active semester (now is within start/end)
    const activeSemester = semesters.find((s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      // Set end date to end of day to be inclusive
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    });

    if (activeSemester) {
      setSelectedSemester(activeSemester.id);
      return;
    }

    // 2. If no active semester, find the closest one by start date
    // Sort logic: minimize distance between now and (start OR end)
    // Actually, usually "closest" means the one starting soonest or just ended
    const closestSemester = semesters.reduce((prev, curr) => {
      // Distance to time range [start, end]
      const getDist = (s: typeof prev) => {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        const nowTime = now.getTime();

        if (nowTime >= start && nowTime <= end) return 0; // inside
        if (nowTime < start) return start - nowTime; // future
        return nowTime - end; // past
      };

      return getDist(curr) < getDist(prev) ? curr : prev;
    });

    if (closestSemester) {
      setSelectedSemester(closestSemester.id);
    }
  }, [semesters, semestersLoading, selectedSemesterId, setSelectedSemester]);

  // Fetch scheduler data to get homeroom grades
  const { data: schedulerData } = trpc.scheduler.getSchedulerData.useQuery(
    {
      semesterId: selectedSemesterId ?? 0,
      homeroomId: selectedHomeroomId ?? 0,
    },
    {
      enabled: !!selectedSemesterId && !!selectedHomeroomId,
    }
  );

  const toggleSection = (sectionId: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleGrade = (gradeId: number) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(gradeId)) {
      newExpanded.delete(gradeId);
    } else {
      newExpanded.add(gradeId);
    }
    setExpandedGrades(newExpanded);
  };

  return (
    <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col h-full overflow-hidden">
      {/* Semester Selector */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <label
          htmlFor="semester-select"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Semester
        </label>
        <select
          id="semester-select"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedSemesterId ?? ""}
          onChange={(e) =>
            setSelectedSemester(e.target.value ? Number(e.target.value) : null)
          }
          disabled={semestersLoading}
        >
          <option value="">Select semester...</option>
          {semesters?.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name} (
              {new Date(semester.startDate).toLocaleDateString()} -{" "}
              {new Date(semester.endDate).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* View Mode Toggle */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          View By
        </span>
        <div
          className="flex gap-1"
          role="group"
          aria-label="View mode selection"
        >
          <button
            type="button"
            onClick={() => setViewMode("homeroom")}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              viewMode === "homeroom"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            }`}
            aria-pressed={viewMode === "homeroom"}
          >
            <Home size={14} />
            Homeroom
          </button>
          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors opacity-50 cursor-not-allowed ${
              viewMode === "teacher"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
            }`}
            disabled
            title="Coming soon"
          >
            <Users size={14} />
            Teacher
          </button>
          <button
            type="button"
            onClick={() => setViewMode("room")}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors opacity-50 cursor-not-allowed ${
              viewMode === "room"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
            }`}
            disabled
            title="Coming soon"
          >
            <DoorOpen size={14} />
            Room
          </button>
        </div>
      </div>

      {/* Grade View Mode (for multi-grade homerooms) */}
      {selectedHomeroomId &&
        schedulerData &&
        schedulerData.homeroom.grades.length > 1 && (
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Grade View
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setGradeViewMode("shared")}
                className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  gradeViewMode === "shared"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                }`}
              >
                Shared Classes Only
              </button>
              <div className="grid grid-cols-2 gap-2">
                {schedulerData.homeroom.grades.map((grade, idx) => {
                  const gradeNum =
                    grade.name.match(/\d+/)?.[0] || String(idx + 1);
                  const gradeMode = `grade${gradeNum}`;
                  const colors = [
                    { active: "bg-purple-600", inactive: "" },
                    { active: "bg-emerald-600", inactive: "" },
                    { active: "bg-amber-600", inactive: "" },
                    { active: "bg-cyan-600", inactive: "" },
                  ];
                  const color = colors[idx % colors.length];

                  return (
                    <button
                      key={grade.id}
                      type="button"
                      onClick={() => setGradeViewMode(gradeMode)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        gradeViewMode === gradeMode
                          ? `${color.active} text-white`
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                      }`}
                    >
                      {grade.name} Only
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setGradeViewMode("split")}
                className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  gradeViewMode === "split"
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                }`}
              >
                Split View (Different Colors)
              </button>
            </div>
          </div>
        )}

      {/* Section/Grade/Homeroom Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedSemesterId ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
            Select a semester to view homerooms
          </p>
        ) : treeLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
            Loading...
          </p>
        ) : sectionTree?.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
            No sections found
          </p>
        ) : (
          <div className="space-y-1">
            {sectionTree?.map((section: SectionNode) => (
              <div key={section.id}>
                {/* Section */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
                >
                  {expandedSections.has(section.id) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {section.name}
                </button>

                {/* Grades */}
                {expandedSections.has(section.id) && (
                  <div className="ml-4 space-y-1">
                    {section.grades.map((grade: TreeNode) => (
                      <div key={grade.id}>
                        <button
                          type="button"
                          onClick={() => toggleGrade(grade.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
                        >
                          {expandedGrades.has(grade.id) ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                          {grade.name}
                        </button>

                        {/* Homerooms */}
                        {expandedGrades.has(grade.id) && grade.homerooms && (
                          <div className="ml-4 space-y-0.5">
                            {grade.homerooms.map((homeroom) => {
                              const affectedHomerooms =
                                getHomeroomsWithPendingChanges();
                              const hasPendingChanges = affectedHomerooms.has(
                                homeroom.id
                              );

                              return (
                                <button
                                  key={homeroom.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedHomeroom(homeroom.id)
                                  }
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-all ${
                                    selectedHomeroomId === homeroom.id
                                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                  } ${
                                    hasPendingChanges
                                      ? "shadow-[0_0_12px_rgba(251,191,36,0.5)] border border-amber-400 dark:border-amber-500"
                                      : ""
                                  }`}
                                >
                                  <Home size={12} />
                                  <span className="truncate">
                                    {homeroom.name}
                                    {homeroom.teacherName && (
                                      <span className="text-xs text-zinc-400 ml-1">
                                        • {homeroom.teacherName}
                                      </span>
                                    )}
                                  </span>
                                  {hasPendingChanges && (
                                    <div className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
