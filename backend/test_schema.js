import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function test() {
  const tables = ['users', 'progress', 'mistakes', 'vocab_learned'];
  for (const table of tables) {
    try {
      const info = await client.execute(`PRAGMA table_info(${table});`);
      console.log(`\n================= ${table.toUpperCase()} TABLE COLUMNS =================`);
      console.table(info.rows.map(r => ({
        cid: r.cid,
        name: r.name,
        type: r.type,
        notnull: r.notnull,
        dflt_value: r.dflt_value,
        pk: r.pk
      })));
    } catch (e) {
      console.error(`Error inspecting schema for ${table}:`, e);
    }
  }
}
test();
