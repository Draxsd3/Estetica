// ============================================================================
// Aurora — Camada de conexão com o banco de dados
//
// Desenvolvimento local: node:sqlite (sem dependências, zero config).
// Produção: PostgreSQL via variável DATABASE_URL (requer npm install pg).
//
// O conector expõe uma interface mínima compatível com os dois drivers:
//   db.prepare(sql)  → stmt.run(...), stmt.get(...), stmt.all(...)
//   db.exec(sql)
//   db.transaction(fn)
// ============================================================================

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let pgPool = null;
let sqlite = null;

export function isPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

export async function connectDb() {
  if (isPostgres()) {
    if (pgPool) return pgPool;
    let pg;
    try {
      // eslint-disable-next-line no-console
      pg = await import("pg");
    } catch (err) {
      throw new Error(
        "DATABASE_URL está definida mas o driver 'pg' não está instalado. " +
        "Rode: npm install pg  (ou remova DATABASE_URL para usar SQLite local)."
      );
    }
    const { Pool } = pg;
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // SSL obrigatório na maioria das nuvens gerenciadas (Neon, Supabase, RDS).
      ssl: process.env.PG_SSL !== "false" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    // Testa conexão
    await pgPool.query("SELECT 1");
    // Adapta a interface do pg para a mesma assinatura do sqlite (prepare/run/get/all/exec/transaction)
    return {
      query: (text, params) => pgPool.query(text, params),
      prepare: (sql) => ({
        run: (...args) => pgPool.query(sql, args).then(() => ({})),
        get: (...args) => pgPool.query(sql, args).then((r) => r.rows[0] || null),
        all: (...args) => pgPool.query(sql, args).then((r) => r.rows)
      }),
      exec: (sql) => pgPool.query(sql),
      transaction: async (fn) => {
        const client = await pgPool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn({
            prepare: (sql) => ({
              run: (...args) => client.query(sql, args).then(() => ({})),
              get: (...args) => client.query(sql, args).then((r) => r.rows[0] || null),
              all: (...args) => client.query(sql, args).then((r) => r.rows)
            }),
            exec: (sql) => client.query(sql)
          });
          await client.query("COMMIT");
          return result;
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      },
      close: () => pgPool.end()
    };
  }

  // -------------------- SQLite local --------------------
  if (sqlite) return sqlite;
  const DATA_DIR = join(__dirname, "data");
  mkdirSync(DATA_DIR, { recursive: true });
  sqlite = new DatabaseSync(join(DATA_DIR, "clinica.db"));
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA synchronous = NORMAL");
  return sqlite;
}

export async function closeDb() {
  if (pgPool) { await pgPool.end(); pgPool = null; }
  sqlite = null;
}

export default { connectDb, closeDb, isPostgres };
