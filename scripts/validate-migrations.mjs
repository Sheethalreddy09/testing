import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const db = new PGlite();
const root = fileURLToPath(new URL('../backend/prisma/migrations', import.meta.url));
for (const name of fs.readdirSync(root).sort()) {
  const file = `${root}/${name}/migration.sql`;
  if (fs.existsSync(file)) {
    await db.exec(fs.readFileSync(file, 'utf8'));
    console.log('PASS migration', name);
  }
}
const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
console.log('Tables:', tables.rows.length);
await db.exec(`INSERT INTO users (id,email,"passwordHash","firstName","lastName",role,"updatedAt") VALUES ('admin','a@test.invalid','hash','A','B','PLATFORM_ADMIN',NOW());
INSERT INTO organisations (id,name,slug,"contactEmail",status,"updatedAt") VALUES ('org','Test','test','o@test.invalid','PENDING_VERIFICATION',NOW());
INSERT INTO organisation_verifications (id,"organisationId","actorId",decision,"previousStatus","nextStatus",reason) VALUES ('v','org','admin','APPROVE','PENDING_VERIFICATION','ACTIVE','Reviewed');
INSERT INTO support_cases (id,subject,description,"requesterId",status,"updatedAt") VALUES ('s','Test','Test case','admin','OPEN',NOW());
INSERT INTO support_activities(id,"caseId","actorId",message,"nextStatus") VALUES ('sa','s','admin','Escalated','ESCALATED');
INSERT INTO notifications(id,"recipientId",category,title) VALUES('n','admin','SUPPORT','Support alert');`);
console.log('PASS operational inserts and relations');
let rejected = false;
try {
  await db.exec("DELETE FROM users WHERE id='admin'");
} catch {
  rejected = true;
}
if (!rejected) throw new Error('Audit/history actor deletion must be restricted');
console.log('PASS history actor FK protection');
await db.close();
