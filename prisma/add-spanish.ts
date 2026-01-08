#!/usr/bin/env bun
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Adding Spanish class...");

  // Get Upper School section
  const upperSchool = await prisma.section.findFirst({
    where: { name: "Upper School" },
  });

  if (!upperSchool) {
    console.error("❌ Upper School section not found");
    return;
  }

  // Get Spring 2026 semester
  const spring2026 = await prisma.semester.findFirst({
    where: { name: "Spring 2026" },
  });

  if (!spring2026) {
    console.error("❌ Spring 2026 semester not found");
    return;
  }

  // Check if Spanish already exists
  const existing = await prisma.class.findFirst({
    where: { code: "SPAN101" },
  });

  if (existing) {
    console.log("⏭️  Spanish class already exists");
    return;
  }

  // Create Spanish class (no grade - for entire homeroom)
  const spanish = await prisma.class.create({
    data: {
      code: "SPAN101",
      name: "Spanish",
      section: {
        connect: { id: upperSchool.id },
      },
      semester: {
        connect: { id: spring2026.id },
      },
      // No grade connection - available to all grades in the section
    },
  });

  console.log(`✅ Created Spanish class: ${spanish.name} (${spanish.code})`);
  console.log("   Available to all homerooms in Upper School");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
