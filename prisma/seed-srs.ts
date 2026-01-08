import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SRS homerooms seed...");

  // Check if SRS homerooms already exist
  const existing = await prisma.homeroom.findFirst({
    where: { name: { in: ["SRS A", "SRS B"] } },
  });

  if (existing) {
    console.log("⏭️  SRS homerooms already exist, skipping seed");
    return;
  }

  // Get or create Upper School section
  let upperSchool = await prisma.section.findFirst({
    where: { name: "Upper School" },
  });

  if (!upperSchool) {
    upperSchool = await prisma.section.create({
      data: { name: "Upper School" },
    });
  }

  // Get or create grades
  let grade10 = await prisma.grade.findFirst({
    where: { name: "10th Grade", sectionId: upperSchool.id },
  });
  if (!grade10) {
    grade10 = await prisma.grade.create({
      data: { sectionId: upperSchool.id, name: "10th Grade" },
    });
  }

  let grade11 = await prisma.grade.findFirst({
    where: { name: "11th Grade", sectionId: upperSchool.id },
  });
  if (!grade11) {
    grade11 = await prisma.grade.create({
      data: { sectionId: upperSchool.id, name: "11th Grade" },
    });
  }

  // Get or create Spring 2026 semester
  let spring2026 = await prisma.semester.findFirst({
    where: { name: "Spring 2026" },
  });
  if (!spring2026) {
    spring2026 = await prisma.semester.create({
      data: {
        name: "Spring 2026",
        startDate: new Date("2026-01-05"),
        endDate: new Date("2026-06-10"),
      },
    });
  }

  // Create teachers for SRS
  console.log("Creating SRS teachers...");
  const teacherA = await prisma.teacher.create({
    data: { name: "Ms. Anderson" },
  });

  const teacherB = await prisma.teacher.create({
    data: { name: "Mr. Barnes" },
  });

  const teacherMath = await prisma.teacher.create({
    data: { name: "Dr. Martinez" },
  });

  const teacherScience = await prisma.teacher.create({
    data: { name: "Mrs. Singh" },
  });

  const teacherEnglish = await prisma.teacher.create({
    data: { name: "Mr. Thompson" },
  });

  const teacherHistory = await prisma.teacher.create({
    data: { name: "Ms. Lee" },
  });

  const teacherCareer = await prisma.teacher.create({
    data: { name: "Mr. Rodriguez" },
  });

  // Create homerooms
  console.log("Creating SRS homerooms...");
  let homeroomA = await prisma.homeroom.findFirst({
    where: { name: "SRS A", sectionId: upperSchool.id },
  });

  if (!homeroomA) {
    homeroomA = await prisma.homeroom.create({
      data: {
        sectionId: upperSchool.id,
        teacherId: teacherA.id,
        name: "SRS A",
      },
    });
  }

  let homeroomB = await prisma.homeroom.findFirst({
    where: { name: "SRS B", sectionId: upperSchool.id },
  });

  if (!homeroomB) {
    homeroomB = await prisma.homeroom.create({
      data: {
        sectionId: upperSchool.id,
        teacherId: teacherB.id,
        name: "SRS B",
      },
    });
  }

  // Link homerooms to both grades (10th and 11th)
  console.log("Linking homerooms to grades...");

  // Check if links already exist
  const existingLinksA = await prisma.homeroomGrade.findMany({
    where: { homeroomId: homeroomA.id },
  });

  if (existingLinksA.length === 0) {
    await prisma.homeroomGrade.createMany({
      data: [
        { homeroomId: homeroomA.id, gradeId: grade10.id },
        { homeroomId: homeroomA.id, gradeId: grade11.id },
      ],
    });
  }

  const existingLinksB = await prisma.homeroomGrade.findMany({
    where: { homeroomId: homeroomB.id },
  });

  if (existingLinksB.length === 0) {
    await prisma.homeroomGrade.createMany({
      data: [
        { homeroomId: homeroomB.id, gradeId: grade10.id },
        { homeroomId: homeroomB.id, gradeId: grade11.id },
      ],
    });
  }

  // Get or create room types
  let classroomType = await prisma.roomType.findFirst({
    where: { typeName: "Classroom" },
  });
  if (!classroomType) {
    classroomType = await prisma.roomType.create({
      data: { typeName: "Classroom" },
    });
  }

  let labType = await prisma.roomType.findFirst({
    where: { typeName: "Lab" },
  });
  if (!labType) {
    labType = await prisma.roomType.create({
      data: { typeName: "Lab" },
    });
  }

  // Create rooms
  console.log("Creating rooms...");
  let mathRoom = await prisma.room.findFirst({
    where: { name: "Math Room 201" },
  });
  if (!mathRoom) {
    mathRoom = await prisma.room.create({
      data: {
        name: "Math Room 201",
        typeId: classroomType.id,
        location: "Second Floor",
        building: "Main Building",
      },
    });
  }

  let scienceRoom = await prisma.room.findFirst({
    where: { name: "Science Lab 301" },
  });
  if (!scienceRoom) {
    scienceRoom = await prisma.room.create({
      data: {
        name: "Science Lab 301",
        typeId: labType.id,
        location: "Third Floor",
        building: "Main Building",
      },
    });
  }

  let englishRoom = await prisma.room.findFirst({
    where: { name: "English Room 105" },
  });
  if (!englishRoom) {
    englishRoom = await prisma.room.create({
      data: {
        name: "English Room 105",
        typeId: classroomType.id,
        location: "First Floor",
        building: "Main Building",
      },
    });
  }

  let historyRoom = await prisma.room.findFirst({
    where: { name: "History Room 202" },
  });
  if (!historyRoom) {
    historyRoom = await prisma.room.create({
      data: {
        name: "History Room 202",
        typeId: classroomType.id,
        location: "Second Floor",
        building: "Main Building",
      },
    });
  }

  let careerRoom = await prisma.room.findFirst({
    where: { name: "Career Center 110" },
  });
  if (!careerRoom) {
    careerRoom = await prisma.room.create({
      data: {
        name: "Career Center 110",
        typeId: classroomType.id,
        location: "First Floor",
        building: "Student Services",
      },
    });
  }

  // Create blocks
  console.log("Creating blocks...");
  let block1 = await prisma.block.findFirst({
    where: { name: "Block 1", semesterId: spring2026.id },
  });
  if (!block1) {
    block1 = await prisma.block.create({
      data: {
        name: "Block 1",
        startTime: new Date("1970-01-01T08:00:00Z"),
        endTime: new Date("1970-01-01T09:15:00Z"),
        semesterId: spring2026.id,
      },
    });
  }

  let block2 = await prisma.block.findFirst({
    where: { name: "Block 2", semesterId: spring2026.id },
  });
  if (!block2) {
    block2 = await prisma.block.create({
      data: {
        name: "Block 2",
        startTime: new Date("1970-01-01T09:30:00Z"),
        endTime: new Date("1970-01-01T10:45:00Z"),
        semesterId: spring2026.id,
      },
    });
  }

  let block3 = await prisma.block.findFirst({
    where: { name: "Block 3", semesterId: spring2026.id },
  });
  if (!block3) {
    block3 = await prisma.block.create({
      data: {
        name: "Block 3",
        startTime: new Date("1970-01-01T11:00:00Z"),
        endTime: new Date("1970-01-01T12:15:00Z"),
        semesterId: spring2026.id,
      },
    });
  }

  let block4 = await prisma.block.findFirst({
    where: { name: "Block 4", semesterId: spring2026.id },
  });
  if (!block4) {
    block4 = await prisma.block.create({
      data: {
        name: "Block 4",
        startTime: new Date("1970-01-01T13:00:00Z"),
        endTime: new Date("1970-01-01T14:15:00Z"),
        semesterId: spring2026.id,
      },
    });
  }

  // Create classes (grade-specific)
  console.log("Creating classes...");
  const math10 = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      gradeId: grade10.id,
      name: "Math 10",
      code: "MATH10",
    },
  });

  const math11 = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      gradeId: grade11.id,
      name: "Math 11",
      code: "MATH11",
    },
  });

  const science10 = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      gradeId: grade10.id,
      name: "Science 10",
      code: "SCI10",
    },
  });

  const science11 = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      gradeId: grade11.id,
      name: "Science 11",
      code: "SCI11",
    },
  });

  const history10 = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      gradeId: grade10.id,
      name: "History 10",
      code: "HIST10",
    },
  });

  const career11 = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      gradeId: grade11.id,
      name: "Career & College 11",
      code: "CAREER11",
    },
  });

  // Create English classes (homeroom-specific via ClassSession, but class itself is grade-level)
  const englishA = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      name: "English (SRS A)",
      code: "ENG-A",
    },
  });

  const englishB = await prisma.class.create({
    data: {
      sectionId: upperSchool.id,
      semesterId: spring2026.id,
      name: "English (SRS B)",
      code: "ENG-B",
    },
  });

  // Create class sessions for SRS A
  console.log("Creating class sessions for SRS A...");

  // Math 10 for SRS A (10th graders) - Monday Block 1
  const sessionMath10A = await prisma.classSession.create({
    data: {
      classId: math10.id,
      homeroomId: homeroomA.id,
      blockId: block1.id,
      dayOfWeek: 1,
      roomId: mathRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionMath10A.id,
      teacherId: teacherMath.id,
      roleLookupId: 1, // Primary teacher
    },
  });

  // Math 11 for SRS A (11th graders) - Monday Block 1 (same time as Math 10)
  const sessionMath11A = await prisma.classSession.create({
    data: {
      classId: math11.id,
      homeroomId: homeroomA.id,
      blockId: block1.id,
      dayOfWeek: 1,
      roomId: mathRoom.id, // Same room, different grade
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionMath11A.id,
      teacherId: teacherMath.id,
      roleLookupId: 1,
    },
  });

  // Science 10 for SRS A - Tuesday Block 2
  const sessionScience10A = await prisma.classSession.create({
    data: {
      classId: science10.id,
      homeroomId: homeroomA.id,
      blockId: block2.id,
      dayOfWeek: 2,
      roomId: scienceRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionScience10A.id,
      teacherId: teacherScience.id,
      roleLookupId: 1,
    },
  });

  // Science 11 for SRS A - Tuesday Block 2
  const sessionScience11A = await prisma.classSession.create({
    data: {
      classId: science11.id,
      homeroomId: homeroomA.id,
      blockId: block2.id,
      dayOfWeek: 2,
      roomId: scienceRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionScience11A.id,
      teacherId: teacherScience.id,
      roleLookupId: 1,
    },
  });

  // English for SRS A - Wednesday Block 3
  const sessionEnglishA = await prisma.classSession.create({
    data: {
      classId: englishA.id,
      homeroomId: homeroomA.id,
      blockId: block3.id,
      dayOfWeek: 3,
      roomId: englishRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionEnglishA.id,
      teacherId: teacherEnglish.id,
      roleLookupId: 1,
    },
  });

  // History 10 for SRS A - Thursday Block 4
  const sessionHistory10A = await prisma.classSession.create({
    data: {
      classId: history10.id,
      homeroomId: homeroomA.id,
      blockId: block4.id,
      dayOfWeek: 4,
      roomId: historyRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionHistory10A.id,
      teacherId: teacherHistory.id,
      roleLookupId: 1,
    },
  });

  // Career 11 for SRS A - Friday Block 4
  const sessionCareer11A = await prisma.classSession.create({
    data: {
      classId: career11.id,
      homeroomId: homeroomA.id,
      blockId: block4.id,
      dayOfWeek: 5,
      roomId: careerRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionCareer11A.id,
      teacherId: teacherCareer.id,
      roleLookupId: 1,
    },
  });

  // Create class sessions for SRS B (similar structure)
  console.log("Creating class sessions for SRS B...");

  // Math 10 for SRS B - Monday Block 2
  const sessionMath10B = await prisma.classSession.create({
    data: {
      classId: math10.id,
      homeroomId: homeroomB.id,
      blockId: block2.id,
      dayOfWeek: 1,
      roomId: mathRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionMath10B.id,
      teacherId: teacherMath.id,
      roleLookupId: 1,
    },
  });

  // Math 11 for SRS B - Monday Block 2
  const sessionMath11B = await prisma.classSession.create({
    data: {
      classId: math11.id,
      homeroomId: homeroomB.id,
      blockId: block2.id,
      dayOfWeek: 1,
      roomId: mathRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionMath11B.id,
      teacherId: teacherMath.id,
      roleLookupId: 1,
    },
  });

  // English for SRS B - Tuesday Block 3
  const sessionEnglishB = await prisma.classSession.create({
    data: {
      classId: englishB.id,
      homeroomId: homeroomB.id,
      blockId: block3.id,
      dayOfWeek: 2,
      roomId: englishRoom.id,
    },
  });
  await prisma.classSessionTeacher.create({
    data: {
      classSessionId: sessionEnglishB.id,
      teacherId: teacherEnglish.id,
      roleLookupId: 1,
    },
  });

  console.log("✅ SRS homerooms seed complete!");
  console.log(`   - Created homerooms: ${homeroomA.name}, ${homeroomB.name}`);
  console.log(`   - Each homeroom has grades: 10th and 11th`);
  console.log(`   - Created grade-specific classes and sessions`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
