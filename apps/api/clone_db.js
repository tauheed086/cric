import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.argv[2] || process.env.TARGET_DATABASE_URL;

if (!targetUrl) {
  console.error('\n❌ ERROR: Target database URL is required!');
  console.error('\nUsage:');
  console.error('  node apps/api/clone_db.js "<RENDER_EXTERNAL_DATABASE_URL>"\n');
  process.exit(1);
}

if (!sourceUrl) {
  console.error('\n❌ ERROR: Source database URL not found in apps/api/.env\n');
  process.exit(1);
}

console.log('🔄 Connecting to databases...');
console.log(`  Source (Local):  ${sourceUrl.replace(/:[^:@]+@/, ':****@')}`);
console.log(`  Target (Render): ${targetUrl.replace(/:[^:@]+@/, ':****@')}`);

const source = new PrismaClient({
  datasources: { db: { url: sourceUrl } },
});

const target = new PrismaClient({
  datasources: { db: { url: targetUrl } },
});

async function cloneTable(name, findFn, createManyFn, batchSize = 100) {
  const items = await findFn();
  if (items.length === 0) {
    console.log(`  • ${name.padEnd(25)}: 0 records`);
    return 0;
  }
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    await createManyFn(chunk);
  }
  console.log(`  ✔ ${name.padEnd(25)}: ${items.length} records transferred`);
  return items.length;
}

async function main() {
  console.log('\n🧹 Cleaning existing data on Render target...');
  await target.$transaction([
    target.extrasEvent.deleteMany(),
    target.wicketEvent.deleteMany(),
    target.ballEvent.deleteMany(),
    target.over.deleteMany(),
    target.innings.deleteMany(),
    target.squadSelection.deleteMany(),
    target.toss.deleteMany(),
    target.partnershipSnapshot.deleteMany(),
    target.scorecardProjection.deleteMany(),
    target.match.deleteMany(),
    target.fixture.deleteMany(),
    target.teamPlayer.deleteMany(),
    target.award.deleteMany(),
    target.leaderboardProjection.deleteMany(),
    target.pointsTableProjection.deleteMany(),
    target.player.deleteMany(),
    target.team.deleteMany(),
    target.official.deleteMany(),
    target.venue.deleteMany(),
    target.announcement.deleteMany(),
    target.seasonSettings.deleteMany(),
    target.auditLog.deleteMany(),
    target.userSession.deleteMany(),
    target.tournament.deleteMany(),
    target.adminUser.deleteMany(),
  ]);

  console.log('\n📦 Transferring data from local to Render...\n');

  await cloneTable('AdminUser', () => source.adminUser.findMany(), (data) => target.adminUser.createMany({ data }));
  await cloneTable('Tournament', () => source.tournament.findMany(), (data) => target.tournament.createMany({ data }));
  await cloneTable('SeasonSettings', () => source.seasonSettings.findMany(), (data) => target.seasonSettings.createMany({ data }));
  await cloneTable('Venue', () => source.venue.findMany(), (data) => target.venue.createMany({ data }));
  await cloneTable('Official', () => source.official.findMany(), (data) => target.official.createMany({ data }));
  await cloneTable('Team', () => source.team.findMany(), (data) => target.team.createMany({ data }));
  await cloneTable('Player', () => source.player.findMany(), (data) => target.player.createMany({ data }));
  await cloneTable('TeamPlayer', () => source.teamPlayer.findMany(), (data) => target.teamPlayer.createMany({ data }));
  await cloneTable('Fixture', () => source.fixture.findMany(), (data) => target.fixture.createMany({ data }));
  await cloneTable('Match', () => source.match.findMany(), (data) => target.match.createMany({ data }));
  await cloneTable('Toss', () => source.toss.findMany(), (data) => target.toss.createMany({ data }));
  await cloneTable('SquadSelection', () => source.squadSelection.findMany(), (data) => target.squadSelection.createMany({ data }));
  await cloneTable('Innings', () => source.innings.findMany(), (data) => target.innings.createMany({ data }));
  await cloneTable('Over', () => source.over.findMany(), (data) => target.over.createMany({ data }));
  await cloneTable('BallEvent', () => source.ballEvent.findMany(), (data) => target.ballEvent.createMany({ data }));
  await cloneTable('WicketEvent', () => source.wicketEvent.findMany(), (data) => target.wicketEvent.createMany({ data }));
  await cloneTable('ExtrasEvent', () => source.extrasEvent.findMany(), (data) => target.extrasEvent.createMany({ data }));
  await cloneTable('PartnershipSnapshot', () => source.partnershipSnapshot.findMany(), (data) => target.partnershipSnapshot.createMany({ data }));
  await cloneTable('ScorecardProjection', () => source.scorecardProjection.findMany(), (data) => target.scorecardProjection.createMany({ data }));
  await cloneTable('PointsTableProjection', () => source.pointsTableProjection.findMany(), (data) => target.pointsTableProjection.createMany({ data }));
  await cloneTable('LeaderboardProjection', () => source.leaderboardProjection.findMany(), (data) => target.leaderboardProjection.createMany({ data }));
  await cloneTable('Award', () => source.award.findMany(), (data) => target.award.createMany({ data }));
  await cloneTable('Announcement', () => source.announcement.findMany(), (data) => target.announcement.createMany({ data }));
  await cloneTable('AuditLog', () => source.auditLog.findMany(), (data) => target.auditLog.createMany({ data }));
  await cloneTable('UserSession', () => source.userSession.findMany(), (data) => target.userSession.createMany({ data }));

  console.log('\n🎉 ALL LOCAL DATA SUCCESSFULLY TRANSFERRED TO RENDER POSTGRESQL!\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
