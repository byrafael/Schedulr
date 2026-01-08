import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Create Sections
  console.log("Creating sections...");
  const upperSchool = await prisma.section.create({
    data: { name: "Upper School" },
  });

  const middleSchool = await prisma.section.create({
    data: { name: "Middle School" },
  });

  // 2. Create Grades
  console.log("Creating grades...");
  const grade9 = await prisma.grade.create({
    data: { sectionId: upperSchool.id, name: "9th Grade" },
  });

  const grade10 = await prisma.grade.create({
    data: { sectionId: upperSchool.id, name: "10th Grade" },
  });

  const grade11 = await prisma.grade.create({
    data: { sectionId: upperSchool.id, name: "11th Grade" },
  });

  const grade12 = await prisma.grade.create({
    data: { sectionId: upperSchool.id, name: "12th Grade" },
  });

  const grade6 = await prisma.grade.create({
    data: { sectionId: middleSchool.id, name: "6th Grade" },
  });

  const grade7 = await prisma.grade.create({
    data: { sectionId: middleSchool.id, name: "7th Grade" },
  });

  const grade8 = await prisma.grade.create({
    data: { sectionId: middleSchool.id, name: "8th Grade" },
  });

  // 3. Create Semesters
  console.log("Creating semesters...");
  const fall2025 = await prisma.semester.create({
    data: {
      name: "Fall 2025",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-12-20"),
    },
  });

  const spring2026 = await prisma.semester.create({
    data: {
      name: "Spring 2026",
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-06-10"),
    },
  });

  // 4. Create Teachers
  console.log("Creating teachers...");
  const teachers = await Promise.all([
    prisma.teacher.create({
      data: {
        name: "John Smith",
      },
    }),
    prisma.teacher.create({
      data: {
        name: "Sarah Johnson",
      },
    }),
    prisma.teacher.create({
      data: {
        name: "Michael Williams",
      },
    }),
    prisma.teacher.create({
      data: {
        name: "Emily Brown",
      },
    }),
    prisma.teacher.create({
      data: {
        name: "David Davis",
      },
    }),
    prisma.teacher.create({
      data: {
        name: "Jennifer Miller",
      },
    }),
  ]);

  // 5. Create Homerooms
  console.log("Creating homerooms...");
  const homerooms = await Promise.all([
    prisma.homeroom.create({
      data: {
        sectionId: upperSchool.id,
        teacherId: teachers[0].id,
        name: "9A",
      },
    }),
    prisma.homeroom.create({
      data: {
        sectionId: upperSchool.id,
        teacherId: teachers[1].id,
        name: "9B",
      },
    }),
    prisma.homeroom.create({
      data: {
        sectionId: upperSchool.id,
        teacherId: teachers[2].id,
        name: "10A",
      },
    }),
    prisma.homeroom.create({
      data: {
        sectionId: upperSchool.id,
        teacherId: teachers[3].id,
        name: "11A",
      },
    }),
    prisma.homeroom.create({
      data: {
        sectionId: upperSchool.id,
        teacherId: teachers[4].id,
        name: "12A",
      },
    }),
  ]);

  // Link homerooms to grades
  console.log("Linking homerooms to grades...");
  await Promise.all([
    prisma.homeroomGrade.create({
      data: {
        homeroomId: homerooms[0].id, // 9A
        gradeId: grade9.id,
      },
    }),
    prisma.homeroomGrade.create({
      data: {
        homeroomId: homerooms[1].id, // 9B
        gradeId: grade9.id,
      },
    }),
    prisma.homeroomGrade.create({
      data: {
        homeroomId: homerooms[2].id, // 10A
        gradeId: grade10.id,
      },
    }),
    prisma.homeroomGrade.create({
      data: {
        homeroomId: homerooms[3].id, // 11A
        gradeId: grade11.id,
      },
    }),
    prisma.homeroomGrade.create({
      data: {
        homeroomId: homerooms[4].id, // 12A
        gradeId: grade12.id,
      },
    }),
  ]);

  // 6. Create Room Types and Rooms
  console.log("Creating room types...");
  const classroomType = await prisma.roomType.create({
    data: { typeName: "Classroom" },
  });

  const labType = await prisma.roomType.create({
    data: { typeName: "Lab" },
  });

  const gymType = await prisma.roomType.create({
    data: { typeName: "Gym" },
  });

  console.log("Creating rooms...");
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        name: "Room 101",
        typeId: classroomType.id,
        location: "First Floor",
        building: "Main Building",
      },
    }),
    prisma.room.create({
      data: {
        name: "Room 102",
        typeId: classroomType.id,
        location: "First Floor",
        building: "Main Building",
      },
    }),
    prisma.room.create({
      data: {
        name: "Room 103",
        typeId: classroomType.id,
        location: "First Floor",
        building: "Main Building",
      },
    }),
    prisma.room.create({
      data: {
        name: "Science Lab",
        typeId: labType.id,
        location: "Second Floor",
        building: "Science Wing",
      },
    }),
    prisma.room.create({
      data: {
        name: "Gymnasium",
        typeId: gymType.id,
        location: "Ground Floor",
        building: "Athletic Center",
      },
    }),
  ]);

  // 7. Create Blocks
  console.log("Creating blocks...");
  const blocks = await Promise.all([
    prisma.block.create({
      data: {
        semesterId: spring2026.id,
        name: "A Block",
        startTime: new Date("1970-01-01T08:00:00Z"),
        endTime: new Date("1970-01-01T09:15:00Z"),
      },
    }),
    prisma.block.create({
      data: {
        semesterId: spring2026.id,
        name: "B Block",
        startTime: new Date("1970-01-01T09:20:00Z"),
        endTime: new Date("1970-01-01T10:35:00Z"),
      },
    }),
    prisma.block.create({
      data: {
        semesterId: spring2026.id,
        name: "C Block",
        startTime: new Date("1970-01-01T10:40:00Z"),
        endTime: new Date("1970-01-01T11:55:00Z"),
      },
    }),
    prisma.block.create({
      data: {
        semesterId: spring2026.id,
        name: "D Block",
        startTime: new Date("1970-01-01T13:00:00Z"),
        endTime: new Date("1970-01-01T14:15:00Z"),
      },
    }),
    prisma.block.create({
      data: {
        semesterId: spring2026.id,
        name: "E Block",
        startTime: new Date("1970-01-01T14:20:00Z"),
        endTime: new Date("1970-01-01T15:35:00Z"),
      },
    }),
  ]);

  // 8. Create Classes
  console.log("Creating classes...");
  const classes = await Promise.all([
    prisma.class.create({
      data: {
        semesterId: spring2026.id,
        sectionId: upperSchool.id,
        gradeId: grade9.id,
        code: "ENG9",
        name: "English 9",
      },
    }),
    prisma.class.create({
      data: {
        semesterId: spring2026.id,
        sectionId: upperSchool.id,
        gradeId: grade9.id,
        code: "ALG1",
        name: "Algebra I",
      },
    }),
    prisma.class.create({
      data: {
        semesterId: spring2026.id,
        sectionId: upperSchool.id,
        gradeId: grade9.id,
        code: "BIO",
        name: "Biology",
      },
    }),
    prisma.class.create({
      data: {
        semesterId: spring2026.id,
        sectionId: upperSchool.id,
        gradeId: grade9.id,
        code: "HIST",
        name: "World History",
      },
    }),
    prisma.class.create({
      data: {
        semesterId: spring2026.id,
        sectionId: upperSchool.id,
        gradeId: grade9.id,
        code: "PE",
        name: "Physical Education",
      },
    }),
  ]);

  // 9. Create ClassSessions (scheduled classes for Monday)
  console.log("Creating class sessions...");
  const classSessions = await Promise.all([
    // Monday (dayOfWeek=1) Schedule
    prisma.classSession.create({
      data: {
        classId: classes[0].id, // English 9
        blockId: blocks[0].id, // Block A
        dayOfWeek: 1, // Monday
        semesterId: spring2026.id,
        roomId: rooms[0].id, // Room 101
      },
    }),
    prisma.classSession.create({
      data: {
        classId: classes[1].id, // Algebra I
        blockId: blocks[1].id, // Block B
        dayOfWeek: 1, // Monday
        semesterId: spring2026.id,
        roomId: rooms[1].id, // Room 102
      },
    }),
    prisma.classSession.create({
      data: {
        classId: classes[2].id, // Biology
        blockId: blocks[2].id, // Block C
        dayOfWeek: 1, // Monday
        semesterId: spring2026.id,
        roomId: rooms[3].id, // Science Lab
      },
    }),
    prisma.classSession.create({
      data: {
        classId: classes[3].id, // World History
        blockId: blocks[3].id, // Block D
        dayOfWeek: 1, // Monday
        semesterId: spring2026.id,
        roomId: rooms[2].id, // Room 103
      },
    }),
    prisma.classSession.create({
      data: {
        classId: classes[4].id, // PE
        blockId: blocks[4].id, // Block E
        dayOfWeek: 1, // Monday
        semesterId: spring2026.id,
        roomId: rooms[4].id, // Gymnasium
      },
    }),
  ]);

  // 10. Create Students
  console.log("Creating students...");
  const students = await Promise.all([
    prisma.student.create({
      data: {
        homeroomId: homerooms[0].id, // 9A
        gradeId: grade9.id,
        name: "Alice Anderson",
      },
    }),
    prisma.student.create({
      data: {
        homeroomId: homerooms[0].id, // 9A
        gradeId: grade9.id,
        name: "Bob Baker",
      },
    }),
    prisma.student.create({
      data: {
        homeroomId: homerooms[1].id, // 9B
        gradeId: grade9.id,
        name: "Carol Carter",
      },
    }),
    prisma.student.create({
      data: {
        homeroomId: homerooms[2].id, // 10A
        gradeId: grade10.id,
        name: "Daniel Davis",
      },
    }),
  ]);

  console.log("✅ Seed completed successfully!");
  console.log(`
📊 Created:
- 2 Sections (Upper School, Middle School)
- 7 Grades (6-12)
- 2 Semesters (Fall 2025, Spring 2026)
- ${teachers.length} Teachers
- ${homerooms.length} Homerooms
- 5 Homeroom-Grade links
- 3 Room Types
- ${rooms.length} Rooms
- ${blocks.length} Blocks (A-E)
- ${classes.length} Classes (9th grade courses)
- ${classSessions.length} Class Sessions (Monday schedule)
- ${students.length} Students
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
