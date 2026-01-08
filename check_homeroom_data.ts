import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const homeroomId = 3;
  const semesterId = 2;

  console.log(`Checking Homeroom ${homeroomId}...`);
  
  const homeroom = await prisma.homeroom.findUnique({
    where: { id: homeroomId },
    include: {
      homeroomGrades: { include: { grade: true } },
      section: true
    }
  });

  if (!homeroom) {
    console.log('Homeroom not found!');
    return;
  }

  console.log('Homeroom:', homeroom.name);
  console.log('Grades:', homeroom.homeroomGrades.map(g => `${g.grade.name} (id: ${g.grade.id})`).join(', '));
  console.log('Section:', homeroom.section.name, `(id: ${homeroom.sectionId})`);

  const sessions = await prisma.classSession.findMany({
    where: {
      semesterId,
      class: {
        OR: [
          { gradeId: { in: homeroom.homeroomGrades.map(g => g.gradeId) } },
          { gradeId: null, sectionId: homeroom.sectionId }
        ]
      }
    },
    include: {
      class: true,
      block: true,
      teachers: { include: { teacher: true } }
    }
  });

  console.log(`\nFound ${sessions.length} sessions for this homeroom:`);
  sessions.forEach(s => {
    console.log(`- [${s.class.name}] (${s.class.code}) Grade: ${s.class.gradeId ?? 'Shared'} Block: ${s.block.name} Day: ${s.dayOfWeek}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
