import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, shortName: true, logoUrl: true, jerseyPrimary: true },
  });
  console.log('--- TEAMS IN DB ---');
  for (const t of teams) {
    console.log({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      logoUrlLength: t.logoUrl ? t.logoUrl.length : 0,
      logoUrlPreview: t.logoUrl ? t.logoUrl.slice(0, 40) + '...' : null,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
