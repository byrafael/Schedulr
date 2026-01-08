import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "Starting data migration: updating homeroom_id for existing class sessions..."
  );

  try {
    // For grade-specific classes, assign to homerooms that have that grade
    const result = await prisma.$executeRaw`
      UPDATE class_sessions cs
      INNER JOIN classes c ON cs.class_id = c.id
      INNER JOIN homeroom_grades hg ON c.grade_id = hg.grade_id
      SET cs.homeroom_id = hg.homeroom_id
      WHERE c.grade_id IS NOT NULL 
        AND cs.homeroom_id IS NULL
    `;

    console.log(`✅ Updated ${result} class sessions with homeroom_id`);

    // Count remaining sessions without homeroom_id
    const remaining = await prisma.classSession.count({
      where: { homeroomId: null },
    });

    if (remaining > 0) {
      console.log(
        `⚠️  ${remaining} class sessions still have NULL homeroom_id (likely shared classes)`
      );
      console.log(
        "   These will need to be reassigned through the UI or will be assigned when moved."
      );
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
