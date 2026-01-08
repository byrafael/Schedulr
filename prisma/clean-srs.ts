#!/usr/bin/env bun
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanSRSData() {
  console.log("🧹 Cleaning SRS seed data...\n");

  try {
    // Find SRS homerooms
    const srsHomerooms = await prisma.homeroom.findMany({
      where: {
        name: {
          in: ["SRS A", "SRS B"],
        },
      },
      include: {
        grades: true,
      },
    });

    if (srsHomerooms.length === 0) {
      console.log("✅ No SRS homerooms found. Nothing to clean.");
      return;
    }

    console.log(`Found ${srsHomerooms.length} SRS homeroom(s):`);
    srsHomerooms.forEach((hr) => {
      console.log(
        `  - ${hr.name} (ID: ${hr.id}) with ${hr.grades.length} grade(s)`
      );
    });
    console.log();

    const homeroomIds = srsHomerooms.map((hr) => hr.id);

    // Delete in correct order to respect foreign key constraints
    console.log("📦 Deleting related data...\n");

    // 1. Delete class sessions (references classes and blocks)
    const deletedSessions = await prisma.classSession.deleteMany({
      where: {
        homeroomId: {
          in: homeroomIds,
        },
      },
    });
    console.log(`  ✓ Deleted ${deletedSessions.count} class sessions`);

    // 2. Delete homeroom-grade relationships
    const deletedHomeroomGrades = await prisma.homeroomGrade.deleteMany({
      where: {
        homeroomId: {
          in: homeroomIds,
        },
      },
    });
    console.log(
      `  ✓ Deleted ${deletedHomeroomGrades.count} homeroom-grade links`
    );

    // 3. Delete the homerooms themselves
    const deletedHomerooms = await prisma.homeroom.deleteMany({
      where: {
        id: {
          in: homeroomIds,
        },
      },
    });
    console.log(`  ✓ Deleted ${deletedHomerooms.count} homerooms`);

    // 4. Find and delete SRS-specific classes (those created for SRS)
    const srsClassNames = [
      "Math 10",
      "Math 11",
      "Science 10",
      "Science 11",
      "English A",
      "English B",
      "History 10",
      "Career 11",
    ];

    const deletedClasses = await prisma.class.deleteMany({
      where: {
        name: {
          in: srsClassNames,
        },
      },
    });
    console.log(`  ✓ Deleted ${deletedClasses.count} SRS classes`);

    // 5. Find and delete SRS-specific teachers
    const srsTeacherNames = [
      "Ms. Anderson",
      "Mr. Barnes",
      "Dr. Martinez",
      "Mrs. Chen",
      "Mr. Davis",
      "Ms. Evans",
      "Dr. Foster",
      "Mrs. Garcia",
    ];

    const deletedTeachers = await prisma.teacher.deleteMany({
      where: {
        name: {
          in: srsTeacherNames,
        },
      },
    });
    console.log(`  ✓ Deleted ${deletedTeachers.count} SRS teachers`);

    // 6. Find and delete SRS-specific rooms
    const srsRoomNames = [
      "Math Lab 1",
      "Math Lab 2",
      "Science Lab A",
      "Science Lab B",
      "English 101",
      "English 102",
      "History 201",
      "Career Center",
    ];

    const deletedRooms = await prisma.room.deleteMany({
      where: {
        name: {
          in: srsRoomNames,
        },
      },
    });
    console.log(`  ✓ Deleted ${deletedRooms.count} SRS rooms`);

    console.log("\n✅ SRS data cleaned successfully!");
  } catch (error) {
    console.error("❌ Error cleaning SRS data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanSRSData();
