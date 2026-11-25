// ============================================================================
// Aurora — Script de inicialização do banco de dados
//
// Uso:
//   node db/setup.js          # valida / inicializa o banco
//   node db/setup.js --seed   # aplica o seed (APENAS desenvolvimento/homologação)
//
// Produção (PostgreSQL): aplique o schema diretamente com um cliente SQL:
//   psql -d $DATABASE_URL -f app/db/migrations/001_initial.sql
//   psql -d $DATABASE_URL -f app/db/seed.sql          # apenas homologação
// ============================================================================

import { connectDb, isPostgres } from "./connect.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const __dirname = new URL(".", import.meta.url).pathname;
const seed = process.argv.includes("--seed");

async function main() {
  const db = await connectDb();

  if (isPostgres()) {
    console.log("[db] Modo produção: PostgreSQL via DATABASE_URL");
    console.log("[db] Conexão validada com sucesso.");
    console.log(
      "[db] Para aplicar o schema em produção, rode:\n" +
      `  psql -d "$DATABASE_URL" -f ${join(__dirname, "migrations/001_initial.sql")}\n`
    );
    if (seed) {
      console.warn(
        "[db] --seed: aplique também o seed apenas em homologação:\n" +
        `  psql -d "$DATABASE_URL" -f ${join(__dirname, "seed.sql")}\n` +
        "[db] NÃO aplique o seed em produção com dados reais de pacientes."
      );
    }
  } else {
    console.log("[db] Modo desenvolvimento: SQLite local (node:sqlite)");
    // O schema SQLite já é executado automaticamente em app/db.js.
    const count = db
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'")
      .get().n;
    console.log(`[db] SQLite inicializado com ${count} objetos.`);
    if (seed) {
      console.warn("[db] --seed ignorado: o seed já está embutido em app/db.js.");
    }
  }

  await db.close?.();
  console.log("[db] Concluído.");
}

main().catch((err) => {
  console.error("[db] ERRO:", err.message);
  process.exit(1);
});
