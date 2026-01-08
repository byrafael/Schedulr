import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";

// Days of week constant
const DAYS_OF_WEEK = [1, 2, 3, 4, 5] as const; // Mon-Fri
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Conflict type definitions
 */
const ConflictTypeSchema = z.enum(["teacher", "room", "homeroom", "a_level"]);
const WarningTypeSchema = z.enum(["duplicate_class"]);

export type ConflictType = z.infer<typeof ConflictTypeSchema>;
export type WarningType = z.infer<typeof WarningTypeSchema>;

export interface Conflict {
  type: ConflictType;
  message: string;
  relatedSessionId?: number;
}

export interface Warning {
  type: WarningType;
  message: string;
  relatedSessionId?: number;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: Conflict[];
  warnings: Warning[];
}

/**
 * Scheduler Router
 * Handles all scheduler-related tRPC procedures
 */
export const schedulerRouter = createTRPCRouter({
  /**
   * Get all semesters for dropdown
   * Accessible to any authenticated user
   */
  getSemesters: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.semester.findMany({
      orderBy: { startDate: "desc" },
    });
  }),

  /**
   * Get section/grade/homeroom tree structure
   * Accessible to any authenticated user
   */
  getSectionTree: protectedProcedure
    .input(z.object({ semesterId: z.number() }))
    .query(async ({ ctx }) => {
      const sections = await ctx.db.section.findMany({
        include: {
          grades: {
            include: {
              homeroomGrades: {
                include: {
                  homeroom: {
                    include: {
                      teacher: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Transform into tree structure
      return sections.map((section) => ({
        id: section.id,
        name: section.name,
        grades: section.grades.map((grade) => ({
          id: grade.id,
          name: grade.name,
          homerooms: grade.homeroomGrades.map((hg) => ({
            id: hg.homeroom.id,
            name: hg.homeroom.name,
            teacherName: hg.homeroom.teacher?.name ?? null,
          })),
        })),
      }));
    }),

  /**
   * Get all rooms
   * Accessible to any authenticated user
   */
  getRooms: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.room.findMany({
      include: {
        type: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Get all teachers
   * Accessible to any authenticated user
   */
  getTeachers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.teacher.findMany({
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Get scheduler data for a specific homeroom and semester
   * Requires admin access
   */
  getSchedulerData: adminProcedure
    .input(
      z.object({
        semesterId: z.number(),
        homeroomId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { semesterId, homeroomId } = input;

      // Get homeroom with grades
      const homeroom = await ctx.db.homeroom.findUnique({
        where: { id: homeroomId },
        include: {
          homeroomGrades: {
            include: { grade: true },
          },
          section: true,
          teacher: true,
        },
      });

      if (!homeroom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Homeroom not found",
        });
      }

      // Get blocks for the semester
      const blocks = await ctx.db.block.findMany({
        where: { semesterId },
        orderBy: { startTime: "asc" },
      });

      // Get all rooms
      const rooms = await ctx.db.room.findMany({
        include: { type: true },
        orderBy: { name: "asc" },
      });

      // Get grade IDs for this homeroom
      const gradeIds = homeroom.homeroomGrades.map((hg) => hg.gradeId);

      // Get class sessions for this specific homeroom
      // Filter by homeroomId (for new sessions) OR by classes in this homeroom's grades (for backward compatibility)
      const classSessions = await ctx.db.classSession.findMany({
        where: {
          semesterId,
          OR: [
            { homeroomId },
            {
              homeroomId: null,
              class: {
                OR: [
                  { gradeId: { in: gradeIds } },
                  { gradeId: null, sectionId: homeroom.sectionId },
                ],
              },
            },
          ],
        },
        include: {
          class: true,
          room: true,
          block: true,
          teachers: {
            include: {
              teacher: true,
            },
          },
        },
      });

      return {
        homeroom: {
          id: homeroom.id,
          name: homeroom.name,
          sectionId: homeroom.sectionId,
          sectionName: homeroom.section.name,
          teacherName: homeroom.teacher?.name ?? "No Teacher",
          grades: homeroom.homeroomGrades.map((hg) => ({
            id: hg.gradeId,
            name: hg.grade.name,
          })),
        },
        blocks: blocks.map((block) => ({
          id: block.id,
          name: block.name,
          startTime: block.startTime,
          endTime: block.endTime,
          isEarly: block.isEarly,
          isLate: block.isLate,
        })),
        days: DAYS_OF_WEEK.map((day, index) => ({
          dayOfWeek: day,
          name: DAY_NAMES[index],
        })),
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name,
          typeName: room.type.typeName,
        })),
        sessions: classSessions.map((session) => ({
          id: session.id,
          classId: session.classId,
          classCode: session.class.code,
          className: session.class.name,
          classGradeId: session.class.gradeId,
          blockId: session.blockId,
          blockName: session.block.name,
          dayOfWeek: session.dayOfWeek,
          roomId: session.roomId,
          roomName: session.room.name,
          semesterId: session.semesterId,
          teachers: session.teachers.map((t) => ({
            id: t.teacher.id,
            name: t.teacher.name,
            role: t.role,
          })),
        })),
      };
    }),

  /**
   * Get schedule for a specific resource (room or teacher)
   * Used for conflict resolution modal
   */
  getResourceSchedule: adminProcedure
    .input(
      z.object({
        resourceType: z.enum(["room", "teacher"]),
        resourceId: z.number(),
        semesterId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { resourceType, resourceId, semesterId } = input;

      // Get blocks for the semester
      const blocks = await ctx.db.block.findMany({
        where: { semesterId },
        orderBy: { startTime: "asc" },
      });

      // Get class sessions for this resource
      const classSessions = await ctx.db.classSession.findMany({
        where: {
          semesterId,
          ...(resourceType === "room"
            ? { roomId: resourceId }
            : {
                teachers: {
                  some: {
                    teacherId: resourceId,
                  },
                },
              }),
        },
        include: {
          class: true,
          room: true,
          block: true,
          teachers: {
            include: {
              teacher: true,
            },
          },
        },
      });

      return {
        blocks: blocks.map((block) => ({
          id: block.id,
          name: block.name,
          startTime: block.startTime,
          endTime: block.endTime,
        })),
        days: DAYS_OF_WEEK.map((day, index) => ({
          dayOfWeek: day,
          name: DAY_NAMES[index],
        })),
        sessions: classSessions.map((session) => ({
          id: session.id,
          classId: session.classId,
          classCode: session.class.code,
          className: session.class.name,
          classGradeId: session.class.gradeId,
          blockId: session.blockId,
          blockName: session.block.name,
          dayOfWeek: session.dayOfWeek,
          roomId: session.roomId,
          roomName: session.room.name,
          semesterId: session.semesterId,
          teachers: session.teachers.map((t) => ({
            id: t.teacher.id,
            name: t.teacher.name,
            role: t.role,
          })),
        })),
      };
    }),

  /**
   * Get all classes available for a homeroom/semester (for class bank)
   * Requires admin access
   */
  getAllClasses: adminProcedure
    .input(
      z.object({
        semesterId: z.number(),
        homeroomId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { homeroomId } = input;

      // Get homeroom with grades
      const homeroom = await ctx.db.homeroom.findUnique({
        where: { id: homeroomId },
        include: {
          homeroomGrades: {
            include: { grade: true },
          },
          section: true,
        },
      });

      if (!homeroom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Homeroom not found",
        });
      }

      // Get grade IDs for this homeroom
      const gradeIds = homeroom.homeroomGrades.map((hg) => hg.gradeId);

      // Get all classes that belong to this homeroom's grades or section
      const classes = await ctx.db.class.findMany({
        where: {
          OR: [
            { gradeId: { in: gradeIds } },
            { gradeId: null, sectionId: homeroom.sectionId },
          ],
        },
        include: {
          grade: true,
        },
        orderBy: [{ name: "asc" }],
      });

      return classes.map((cls) => ({
        id: cls.id,
        code: cls.code,
        name: cls.name,
        gradeId: cls.gradeId,
        gradeName: cls.grade?.name ?? null,
      }));
    }),

  /**
   * Validate a new session creation (no side effects)
   */
  validateSessionCreate: adminProcedure
    .input(
      z.object({
        classId: z.number(),
        targetBlockId: z.number(),
        targetDayOfWeek: z.number().min(1).max(5),
        targetRoomId: z.number(),
        semesterId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        classId,
        targetBlockId,
        targetDayOfWeek,
        targetRoomId,
        semesterId,
      } = input;

      const conflicts: Conflict[] = [];
      const warnings: Warning[] = [];

      // Get the class being scheduled
      const classToSchedule = await ctx.db.class.findUnique({
        where: { id: classId },
        include: { grade: true },
      });

      if (!classToSchedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Get block info
      const targetBlock = await ctx.db.block.findUnique({
        where: { id: targetBlockId },
      });

      if (!targetBlock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target block not found",
        });
      }

      // 1. Check room conflicts
      const roomConflict = await ctx.db.classSession.findFirst({
        where: {
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          roomId: targetRoomId,
          semesterId,
        },
        include: {
          class: true,
          room: true,
        },
      });

      if (roomConflict) {
        conflicts.push({
          type: "room",
          message: `${roomConflict.room.name} is already booked for ${
            roomConflict.class.name
          } in ${targetBlock.name} (${DAY_NAMES[targetDayOfWeek - 1]}).`,
          relatedSessionId: roomConflict.id,
        });
      }

      // 2. Check room conflicts (duties)
      const roomDutyConflict = await ctx.db.duty.findFirst({
        where: {
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          roomId: targetRoomId,
          semesterId,
        },
        include: {
          dutyType: true,
          room: true,
          teacher: true,
        },
      });

      if (roomDutyConflict) {
        conflicts.push({
          type: "room",
          message: `${roomDutyConflict.room.name} is in use for ${
            roomDutyConflict.dutyType.typeName
          } duty by ${roomDutyConflict.teacher.name} in ${targetBlock.name} (${
            DAY_NAMES[targetDayOfWeek - 1]
          }).`,
        });
      }

      // 3. Check homeroom overlap - same grade students can't be in two places
      if (classToSchedule.gradeId) {
        const homeroomConflict = await ctx.db.classSession.findFirst({
          where: {
            blockId: targetBlockId,
            dayOfWeek: targetDayOfWeek,
            semesterId,
            class: {
              gradeId: classToSchedule.gradeId,
            },
          },
          include: {
            class: true,
          },
        });

        if (homeroomConflict) {
          conflicts.push({
            type: "homeroom",
            message: `Students would have a conflict: ${
              homeroomConflict.class.name
            } is scheduled at the same time in ${targetBlock.name} (${
              DAY_NAMES[targetDayOfWeek - 1]
            }).`,
            relatedSessionId: homeroomConflict.id,
          });
        }
      }

      // 4. Check grade-independent vs grade-specific conflicts
      const conflictingSessions = await ctx.db.classSession.findMany({
        where: {
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          semesterId,
        },
        include: { class: true },
      });

      for (const conflictSession of conflictingSessions) {
        // If scheduling a grade-specific class and there's a shared class
        if (
          classToSchedule.gradeId !== null &&
          conflictSession.class.gradeId === null
        ) {
          conflicts.push({
            type: "homeroom",
            message: `Cannot schedule grade-specific class. ${
              conflictSession.class.name
            } (shared) is already scheduled in ${targetBlock.name} (${
              DAY_NAMES[targetDayOfWeek - 1]
            }).`,
            relatedSessionId: conflictSession.id,
          });
        }

        // If scheduling a shared class and there are grade-specific classes
        if (
          classToSchedule.gradeId === null &&
          conflictSession.class.gradeId !== null
        ) {
          conflicts.push({
            type: "homeroom",
            message: `Cannot schedule shared class. ${
              conflictSession.class.name
            } (grade-specific) is already scheduled in ${targetBlock.name} (${
              DAY_NAMES[targetDayOfWeek - 1]
            }).`,
            relatedSessionId: conflictSession.id,
          });
        }
      }

      // 5. Check for duplicate classes in the same day
      const duplicateCheck = await ctx.db.classSession.findMany({
        where: {
          dayOfWeek: targetDayOfWeek,
          semesterId,
          classId: classId,
        },
        include: {
          class: true,
          block: true,
        },
      });

      if (duplicateCheck.length > 0) {
        warnings.push({
          type: "duplicate_class",
          message: `${classToSchedule.name} is already scheduled ${
            duplicateCheck.length
          } time(s) on ${DAY_NAMES[targetDayOfWeek - 1]}.`,
          relatedSessionId: duplicateCheck[0].id,
        });
      }

      return {
        valid: conflicts.length === 0,
        conflicts,
        warnings,
      };
    }),

  /**
   * Validate a session move (no side effects)
   */
  validateSessionMove: adminProcedure
    .input(
      z.object({
        classSessionId: z.number(),
        targetBlockId: z.number(),
        targetDayOfWeek: z.number().min(1).max(5),
        targetRoomId: z.number(),
        semesterId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        classSessionId,
        targetBlockId,
        targetDayOfWeek,
        targetRoomId,
        semesterId,
      } = input;

      const conflicts: Conflict[] = [];
      const warnings: Warning[] = [];

      // Get the session being moved
      const session = await ctx.db.classSession.findUnique({
        where: { id: classSessionId },
        include: {
          teachers: {
            include: { teacher: true },
          },
          class: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class session not found",
        });
      }

      // Get block info for better error messages
      const targetBlock = await ctx.db.block.findUnique({
        where: { id: targetBlockId },
      });

      if (!targetBlock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target block not found",
        });
      }

      // 1. Check teacher double booking
      for (const teacherAssignment of session.teachers) {
        // Check if teacher has another class at this time
        const teacherConflict = await ctx.db.classSessionTeacher.findFirst({
          where: {
            teacherId: teacherAssignment.teacherId,
            classSession: {
              id: { not: classSessionId },
              blockId: targetBlockId,
              dayOfWeek: targetDayOfWeek,
              semesterId,
            },
          },
          include: {
            classSession: {
              include: { class: true },
            },
          },
        });

        if (teacherConflict) {
          conflicts.push({
            type: "teacher",
            message: `${teacherAssignment.teacher.name} is already teaching ${
              teacherConflict.classSession.class.name
            } in ${targetBlock.name} (${DAY_NAMES[targetDayOfWeek - 1]}).`,
            relatedSessionId: teacherConflict.classSession.id,
          });
        }

        // Check if teacher has a duty at this time
        const dutyConflict = await ctx.db.duty.findFirst({
          where: {
            teacherId: teacherAssignment.teacherId,
            blockId: targetBlockId,
            dayOfWeek: targetDayOfWeek,
            semesterId,
          },
          include: {
            dutyType: true,
          },
        });

        if (dutyConflict) {
          conflicts.push({
            type: "teacher",
            message: `${teacherAssignment.teacher.name} has ${
              dutyConflict.dutyType.typeName
            } duty in ${targetBlock.name} (${DAY_NAMES[targetDayOfWeek - 1]}).`,
          });
        }
      }

      // 2. Check room conflicts (classes)
      const roomConflict = await ctx.db.classSession.findFirst({
        where: {
          id: { not: classSessionId },
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          roomId: targetRoomId,
          semesterId,
        },
        include: {
          class: true,
          room: true,
        },
      });

      if (roomConflict) {
        conflicts.push({
          type: "room",
          message: `${roomConflict.room.name} is already booked for ${
            roomConflict.class.name
          } in ${targetBlock.name} (${DAY_NAMES[targetDayOfWeek - 1]}).`,
          relatedSessionId: roomConflict.id,
        });
      }

      // 3. Check room conflicts (duties)
      const roomDutyConflict = await ctx.db.duty.findFirst({
        where: {
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          roomId: targetRoomId,
          semesterId,
        },
        include: {
          dutyType: true,
          room: true,
          teacher: true,
        },
      });

      if (roomDutyConflict) {
        conflicts.push({
          type: "room",
          message: `${roomDutyConflict.room.name} is in use for ${
            roomDutyConflict.dutyType.typeName
          } duty by ${roomDutyConflict.teacher.name} in ${targetBlock.name} (${
            DAY_NAMES[targetDayOfWeek - 1]
          }).`,
        });
      }

      // 4. Check homeroom overlap - same grade students can't be in two places
      const classGradeId = session.class.gradeId;
      if (classGradeId) {
        const homeroomConflict = await ctx.db.classSession.findFirst({
          where: {
            id: { not: classSessionId },
            blockId: targetBlockId,
            dayOfWeek: targetDayOfWeek,
            semesterId,
            class: {
              gradeId: classGradeId,
            },
          },
          include: {
            class: true,
          },
        });

        if (homeroomConflict) {
          conflicts.push({
            type: "homeroom",
            message: `Students would have a conflict: ${
              homeroomConflict.class.name
            } is scheduled at the same time in ${targetBlock.name} (${
              DAY_NAMES[targetDayOfWeek - 1]
            }).`,
            relatedSessionId: homeroomConflict.id,
          });
        }
      }

      // 5. Check grade-independent vs grade-specific conflicts
      const conflictingSessions = await ctx.db.classSession.findMany({
        where: {
          id: { not: classSessionId },
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          semesterId,
        },
        include: { class: true },
      });

      for (const conflictSession of conflictingSessions) {
        // If moving a grade-specific class and there's a shared class
        if (
          session.class.gradeId !== null &&
          conflictSession.class.gradeId === null
        ) {
          conflicts.push({
            type: "homeroom",
            message: `Cannot schedule grade-specific class. ${
              conflictSession.class.name
            } (shared) is already scheduled in ${targetBlock.name} (${
              DAY_NAMES[targetDayOfWeek - 1]
            }).`,
            relatedSessionId: conflictSession.id,
          });
        }

        // If moving a shared class and there are grade-specific classes
        if (
          session.class.gradeId === null &&
          conflictSession.class.gradeId !== null
        ) {
          conflicts.push({
            type: "homeroom",
            message: `Cannot schedule shared class. ${
              conflictSession.class.name
            } (grade-specific) is already scheduled in ${targetBlock.name} (${
              DAY_NAMES[targetDayOfWeek - 1]
            }).`,
            relatedSessionId: conflictSession.id,
          });
        }
      }

      // 6. Check for duplicate classes in the same day (warning, not blocking)
      const duplicateCheck = await ctx.db.classSession.findMany({
        where: {
          id: { not: classSessionId },
          dayOfWeek: targetDayOfWeek,
          semesterId,
          classId: session.classId,
        },
        include: {
          class: true,
          block: true,
        },
      });

      if (duplicateCheck.length > 0) {
        warnings.push({
          type: "duplicate_class",
          message: `${session.class.name} is already scheduled ${
            duplicateCheck.length
          } time(s) on ${DAY_NAMES[targetDayOfWeek - 1]}.`,
          relatedSessionId: duplicateCheck[0].id,
        });
      }

      return {
        valid: conflicts.length === 0,
        conflicts,
        warnings,
      };
    }),

  /**
   * Move a class session to a new block/day/room
   */
  moveClassSession: adminProcedure
    .input(
      z.object({
        classSessionId: z.number(),
        targetBlockId: z.number(),
        targetDayOfWeek: z.number().min(1).max(5),
        targetRoomId: z.number(),
        semesterId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        classSessionId,
        targetBlockId,
        targetDayOfWeek,
        targetRoomId,
        semesterId,
      } = input;

      // Re-validate before making changes
      const session = await ctx.db.classSession.findUnique({
        where: { id: classSessionId },
        include: {
          teachers: { include: { teacher: true } },
          class: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class session not found",
        });
      }

      const targetBlock = await ctx.db.block.findUnique({
        where: { id: targetBlockId },
      });

      if (!targetBlock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target block not found",
        });
      }

      // Collect all conflicts
      const conflicts: Conflict[] = [];

      // Check teacher conflicts
      for (const teacherAssignment of session.teachers) {
        const teacherConflict = await ctx.db.classSessionTeacher.findFirst({
          where: {
            teacherId: teacherAssignment.teacherId,
            classSession: {
              id: { not: classSessionId },
              blockId: targetBlockId,
              dayOfWeek: targetDayOfWeek,
              semesterId,
            },
          },
          include: {
            classSession: { include: { class: true } },
          },
        });

        if (teacherConflict) {
          conflicts.push({
            type: "teacher",
            message: `${teacherAssignment.teacher.name} is already teaching ${teacherConflict.classSession.class.name} at this time.`,
            relatedSessionId: teacherConflict.classSession.id,
          });
        }

        const dutyConflict = await ctx.db.duty.findFirst({
          where: {
            teacherId: teacherAssignment.teacherId,
            blockId: targetBlockId,
            dayOfWeek: targetDayOfWeek,
            semesterId,
          },
        });

        if (dutyConflict) {
          conflicts.push({
            type: "teacher",
            message: `${teacherAssignment.teacher.name} has a duty at this time.`,
          });
        }
      }

      // Check room conflicts
      const roomConflict = await ctx.db.classSession.findFirst({
        where: {
          id: { not: classSessionId },
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          roomId: targetRoomId,
          semesterId,
        },
      });

      if (roomConflict) {
        conflicts.push({
          type: "room",
          message: "Room is already booked at this time.",
          relatedSessionId: roomConflict.id,
        });
      }

      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: conflicts.map((c) => c.message).join("; "),
        });
      }

      // Perform the update
      const updated = await ctx.db.classSession.update({
        where: { id: classSessionId },
        data: {
          blockId: targetBlockId,
          dayOfWeek: targetDayOfWeek,
          roomId: targetRoomId,
        },
        include: {
          class: true,
          room: true,
          block: true,
          teachers: { include: { teacher: true } },
        },
      });

      return {
        id: updated.id,
        classId: updated.classId,
        classCode: updated.class.code,
        className: updated.class.name,
        blockId: updated.blockId,
        blockName: updated.block.name,
        dayOfWeek: updated.dayOfWeek,
        roomId: updated.roomId,
        roomName: updated.room.name,
        semesterId: updated.semesterId,
        teachers: updated.teachers.map((t) => ({
          id: t.teacher.id,
          name: t.teacher.name,
          role: t.role,
        })),
      };
    }),

  /**
   * Remove a class session from the schedule
   */
  removeClassSession: adminProcedure
    .input(z.object({ classSessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.classSession.findUnique({
        where: { id: input.classSessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class session not found",
        });
      }

      await ctx.db.classSession.delete({
        where: { id: input.classSessionId },
      });

      return { success: true };
    }),

  /**
   * Update room for a class session
   */
  updateSessionRoom: adminProcedure
    .input(
      z.object({
        classSessionId: z.number(),
        roomId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { classSessionId, roomId } = input;

      const session = await ctx.db.classSession.findUnique({
        where: { id: classSessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class session not found",
        });
      }

      // Check room availability
      const roomConflict = await ctx.db.classSession.findFirst({
        where: {
          id: { not: classSessionId },
          blockId: session.blockId,
          dayOfWeek: session.dayOfWeek,
          roomId,
          semesterId: session.semesterId,
        },
        include: { class: true, room: true },
      });

      if (roomConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Room is already booked for ${roomConflict.class.name} at this time.`,
        });
      }

      const updated = await ctx.db.classSession.update({
        where: { id: classSessionId },
        data: { roomId },
        include: {
          class: true,
          room: true,
          block: true,
          teachers: { include: { teacher: true } },
        },
      });

      return {
        id: updated.id,
        classId: updated.classId,
        classCode: updated.class.code,
        className: updated.class.name,
        blockId: updated.blockId,
        blockName: updated.block.name,
        dayOfWeek: updated.dayOfWeek,
        roomId: updated.roomId,
        roomName: updated.room.name,
        semesterId: updated.semesterId,
        teachers: updated.teachers.map((t) => ({
          id: t.teacher.id,
          name: t.teacher.name,
          role: t.role,
        })),
      };
    }),

  /**
   * Create a new class session (from class bank)
   * Requires admin access
   */
  createClassSession: adminProcedure
    .input(
      z.object({
        classId: z.number(),
        blockId: z.number(),
        dayOfWeek: z.number().min(1).max(5),
        roomId: z.number(),
        semesterId: z.number(),
        homeroomId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { classId, blockId, dayOfWeek, roomId, semesterId, homeroomId } =
        input;

      // Get the class being scheduled
      const classToSchedule = await ctx.db.class.findUnique({
        where: { id: classId },
      });

      if (!classToSchedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Check if a session already exists for this block/day/room/semester
      const existing = await ctx.db.classSession.findFirst({
        where: {
          blockId,
          dayOfWeek,
          roomId,
          semesterId,
        },
        include: {
          class: { include: { grade: true } },
          block: true,
          room: true,
        },
      });

      if (existing) {
        const dayName = DAY_NAMES[existing.dayOfWeek - 1] ?? "Unknown Day";
        const gradeInfo = existing.class.grade
          ? ` (${existing.class.grade.name})`
          : "";
        throw new TRPCError({
          code: "CONFLICT",
          message: `${existing.block.name} on ${dayName} in ${existing.room.name} is already occupied by ${existing.class.name}${gradeInfo}`,
        });
      }

      // Check for grade-independent/grade-specific conflicts at this block/day
      const conflictingSessions = await ctx.db.classSession.findMany({
        where: {
          blockId,
          dayOfWeek,
          semesterId,
        },
        include: { class: true },
      });

      for (const session of conflictingSessions) {
        // If scheduling a grade-specific class and there's a shared class
        if (
          classToSchedule.gradeId !== null &&
          session.class.gradeId === null
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot schedule grade-specific class. ${session.class.name} (shared) is already scheduled at this time.`,
          });
        }

        // If scheduling a shared class and there are grade-specific classes
        if (
          classToSchedule.gradeId === null &&
          session.class.gradeId !== null
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot schedule shared class. ${session.class.name} (grade-specific) is already scheduled at this time.`,
          });
        }
      }

      // Create the session
      const created = await ctx.db.classSession.create({
        data: {
          classId,
          blockId,
          dayOfWeek,
          roomId,
          semesterId,
          homeroomId,
        },
        include: {
          class: true,
          room: true,
          block: true,
          teachers: { include: { teacher: true } },
        },
      });

      return {
        id: created.id,
        classId: created.classId,
        classCode: created.class.code,
        className: created.class.name,
        classGradeId: created.class.gradeId,
        blockId: created.blockId,
        blockName: created.block.name,
        dayOfWeek: created.dayOfWeek,
        roomId: created.roomId,
        roomName: created.room.name,
        semesterId: created.semesterId,
        teachers: created.teachers.map((t) => ({
          id: t.teacher.id,
          name: t.teacher.name,
          role: t.role,
        })),
      };
    }),

  /**
   * Batch save changes (moves, creations, updates)
   * Executes in a transaction to ensure consistency and performance
   */
  batchSaveChanges: adminProcedure
    .input(
      z.object({
        changes: z.array(
          z.object({
            type: z.enum(["move", "create", "update_room", "update_teacher"]),
            sessionId: z.number(), // For move/update_room/update_teacher
            // For create/move:
            blockId: z.number().optional(),
            dayOfWeek: z.number().min(1).max(5).optional(),
            roomId: z.number().optional(),
            // For create:
            classId: z.number().optional(),
            semesterId: z.number().optional(),
            homeroomId: z.number().optional(),
            // For update_teacher:
            teacherId: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { changes } = input;

      // Use a transaction
      return await ctx.db.$transaction(async (tx) => {
        const results = [];

        for (const change of changes) {
          if (change.type === "create") {
            if (
              !change.classId ||
              !change.blockId ||
              !change.dayOfWeek ||
              !change.roomId ||
              !change.semesterId
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing required fields for create",
              });
            }

            // Verify class exists (optimization: could load all at once but for now distinct checks are safer for logic)
            // Note: In a transaction, these run sequentially on the connection
            const cls = await tx.class.findUnique({
              where: { id: change.classId },
              include: { grade: true },
            });
            if (!cls) continue; // Skip invalid

            // Check availability (basic) - Detailed logic duplicated from createClassSession roughly
            // For batch operations, we assume client side or previous validation caught most things,
            // but we must enforce DB constraints.

            // 1. Grade Conflict Check (Prevent double booking for same grade)
            if (cls.gradeId) {
              const gradeConflict = await tx.classSession.findFirst({
                where: {
                  blockId: change.blockId,
                  dayOfWeek: change.dayOfWeek,
                  semesterId: change.semesterId,
                  class: {
                    gradeId: cls.gradeId,
                  },
                },
                include: { class: true },
              });

              if (gradeConflict) {
                const gradeName = cls.grade ? cls.grade.name : cls.gradeId;
                throw new TRPCError({
                  code: "CONFLICT",
                  message: `Grade Conflict: Grade ${gradeName} already has ${gradeConflict.class.name} scheduled at this time.`,
                });
              }
            }

            // The UNIQUE constraint on (blockId, dayOfWeek, roomId, semesterId) will throw if we violate it.
            // We'll let the DB constraints handle the hard conflicts to keep this transaction fast.

            const created = await tx.classSession.create({
              data: {
                classId: change.classId,
                blockId: change.blockId,
                dayOfWeek: change.dayOfWeek,
                roomId: change.roomId,
                semesterId: change.semesterId,
                homeroomId: change.homeroomId,
              },
            });
            results.push({ type: "create", id: created.id });
          } else if (change.type === "move") {
            if (
              !change.blockId ||
              !change.dayOfWeek ||
              !change.roomId ||
              !change.sessionId
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing required fields for move",
              });
            }

            const session = await tx.classSession.findUnique({
              where: { id: change.sessionId },
              include: { class: { include: { grade: true } } },
            });

            if (!session) {
              // If session not found, maybe deleted? Skip or throw.
              // For safety in batch, create error for user visibility
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Session ${change.sessionId} not found`,
              });
            }

            // 1. Grade Conflict Check
            if (session.class.gradeId) {
              const gradeConflict = await tx.classSession.findFirst({
                where: {
                  id: { not: change.sessionId },
                  blockId: change.blockId,
                  dayOfWeek: change.dayOfWeek,
                  semesterId: session.semesterId,
                  class: {
                    gradeId: session.class.gradeId,
                  },
                },
                include: { class: true },
              });

              if (gradeConflict) {
                const gradeName = session.class.grade
                  ? session.class.grade.name
                  : session.class.gradeId;
                throw new TRPCError({
                  code: "CONFLICT",
                  message: `Grade Conflict: Grade ${gradeName} already has ${gradeConflict.class.name} scheduled at this time.`,
                });
              }
            }

            const updated = await tx.classSession.update({
              where: { id: change.sessionId },
              data: {
                blockId: change.blockId,
                dayOfWeek: change.dayOfWeek,
                roomId: change.roomId,
              },
            });
            results.push({ type: "move", id: updated.id });
          } else if (change.type === "update_room") {
            if (!change.roomId || !change.sessionId) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing required fields for update_room",
              });
            }

            const updated = await tx.classSession.update({
              where: { id: change.sessionId },
              data: {
                roomId: change.roomId,
              },
            });
            results.push({ type: "update_room", id: updated.id });
          } else if (change.type === "update_teacher") {
            if (!change.teacherId || !change.sessionId) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing required fields for update_teacher",
              });
            }

            // First, remove existing teacher assignments for this session
            await tx.classSessionTeacher.deleteMany({
              where: {
                classSessionId: change.sessionId,
              },
            });

            // Then add the new teacher assignment
            await tx.classSessionTeacher.create({
              data: {
                classSessionId: change.sessionId,
                teacherId: change.teacherId,
                role: "Primary",
              },
            });

            results.push({ type: "update_teacher", id: change.sessionId });
          }
        }

        return results;
      });
    }),
});
