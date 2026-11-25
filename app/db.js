// Banco de dados da clínica — SQLite nativo do Node (sem dependências).
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "clinica.db"));
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS professionals (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT, council TEXT,
  color TEXT DEFAULT '#1F4E43', commission_pct REAL DEFAULT 10, active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, cpf TEXT,
  birth TEXT, notes TEXT, created_at TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, minutes INTEGER DEFAULT 60,
  price_cents INTEGER NOT NULL, active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, unit TEXT DEFAULT 'un',
  cost_cents INTEGER NOT NULL, min_stock REAL DEFAULT 0, lot_controlled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS service_materials (
  id INTEGER PRIMARY KEY, service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), qty REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_lots (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id),
  lot TEXT, expires_on TEXT, qty REAL NOT NULL, qty_initial REAL NOT NULL, supplier TEXT
);

CREATE TABLE IF NOT EXISTS stock_moves (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, lot_id INTEGER, kind TEXT NOT NULL,
  qty REAL NOT NULL, reason TEXT, encounter_id INTEGER, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY, number INTEGER NOT NULL, patient_id INTEGER NOT NULL REFERENCES patients(id),
  professional_id INTEGER REFERENCES professionals(id), status TEXT NOT NULL DEFAULT 'enviado',
  valid_until TEXT, subtotal_cents INTEGER NOT NULL DEFAULT 0, discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL,
  approved_at TEXT, lost_reason TEXT
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY, quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL, qty_sessions INTEGER NOT NULL DEFAULT 1,
  unit_cents INTEGER NOT NULL, discount_cents INTEGER NOT NULL DEFAULT 0, total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY, quote_id INTEGER, patient_id INTEGER NOT NULL REFERENCES patients(id),
  total_cents INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'avulso', status TEXT NOT NULL DEFAULT 'ativa',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY, sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL, qty_sessions INTEGER NOT NULL, unit_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL, sessions_done INTEGER NOT NULL DEFAULT 0,
  revenue_recognized_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS receivables (
  id INTEGER PRIMARY KEY, sale_id INTEGER REFERENCES sales(id), patient_id INTEGER NOT NULL,
  seq INTEGER NOT NULL DEFAULT 1, due_date TEXT NOT NULL, amount_cents INTEGER NOT NULL,
  paid_cents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'aberto'
);

CREATE TABLE IF NOT EXISTS payables (
  id INTEGER PRIMARY KEY, supplier TEXT NOT NULL, category TEXT, due_date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL, paid_cents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'aberto'
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY, receivable_id INTEGER REFERENCES receivables(id), amount_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0, method TEXT, paid_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, professional_id INTEGER NOT NULL,
  service_id INTEGER, sale_item_id INTEGER, starts_at TEXT NOT NULL, duration_min INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'agendado', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS encounters (
  id INTEGER PRIMARY KEY, appointment_id INTEGER, patient_id INTEGER NOT NULL, professional_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto', notes TEXT, opened_at TEXT NOT NULL, closed_at TEXT
);

CREATE TABLE IF NOT EXISTS encounter_materials (
  id INTEGER PRIMARY KEY, encounter_id INTEGER NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, lot_id INTEGER, qty REAL NOT NULL, cost_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS commission_entries (
  id INTEGER PRIMARY KEY, professional_id INTEGER NOT NULL, sale_item_id INTEGER,
  encounter_id INTEGER, base_cents INTEGER NOT NULL, amount_cents INTEGER NOT NULL,
  period TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'liberado', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revenue_entries (
  id INTEGER PRIMARY KEY, encounter_id INTEGER, sale_item_id INTEGER,
  amount_cents INTEGER NOT NULL, period TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status, due_date);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(starts_at);
`;

db.exec(SCHEMA);

// ---------------------------------------------------------------- helpers

export const money = (cents) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const brDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const monthKey = (iso) => iso.slice(0, 7);

const setting = (key, fallback) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
};

// ---------------------------------------------------------------- seed

function seed() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM patients").get().n;
  if (count > 0) return;

  const insert = (sql, ...args) => Number(db.prepare(sql).run(...args).lastInsertRowid);
  const now = new Date().toISOString();
  const today = todayISO();
  const month = monthKey(today);

  for (const [k, v] of Object.entries({
    clinic_name: "Clínica Aurora",
    room_hour_cents: 4000,
    prof_hour_cents: 12000,
    card_fee_pct: 2.5,
    quote_validity_days: 15,
  })) {
    insert("INSERT INTO settings (key, value) VALUES (?, ?)", k, String(v));
  }

  // profissionais
  const profs = [
    ["Dra. Marina Alves", "Biomédica", "CRBM 12345", "#1F4E43", 10],
    ["Camila Souza", "Esteticista", "—", "#B08255", 8],
    ["Dr. Rafael Lima", "Médico", "CRM 54321", "#3E6B8A", 12],
  ].map((p) =>
    insert(
      "INSERT INTO professionals (name, role, council, color, commission_pct) VALUES (?,?,?,?,?)",
      ...p
    )
  );

  // produtos e lotes
  const prods = [
    ["Toxina botulínica 100U", "frasco", 140000, 2],
    ["Ácido hialurônico 1ml", "seringa", 85000, 2],
    ["Seringa 1ml", "un", 300, 10],
    ["Agulha 30G", "un", 200, 20],
    ["Luva descartável", "par", 250, 30],
    ["Gaze estéril", "pacote", 100, 20],
    ["Anestésico tópico", "bisnaga", 3500, 3],
    ["Ponteira dermapen", "un", 4500, 5],
    ["Membrana criolipólise", "un", 5000, 4],
  ].map((p) => insert("INSERT INTO products (name, unit, cost_cents, min_stock) VALUES (?,?,?,?)", ...p));

  const [toxina, ah, seringa, agulha, luva, gaze, anestesico, ponteira, membrana] = prods;

  const lot = (product_id, code, daysToExpire, qty, supplier) =>
    insert(
      "INSERT INTO stock_lots (product_id, lot, expires_on, qty, qty_initial, supplier) VALUES (?,?,?,?,?,?)",
      product_id, code, addDays(today, daysToExpire), qty, qty, supplier
    );

  lot(toxina, "TX-2410", 180, 4, "Allergan");
  lot(toxina, "TX-2405", 22, 1, "Allergan");
  lot(ah, "AH-9931", 300, 5, "Galderma");
  lot(seringa, "SG-01", 900, 40, "Descarpack");
  lot(agulha, "AG-30", 900, 60, "BD");
  lot(luva, "LV-12", 500, 80, "Supermax");
  lot(gaze, "GZ-08", 700, 30, "Cremer");
  lot(anestesico, "AN-77", 240, 6, "Lidocaína");
  lot(ponteira, "DP-22", 600, 12, "Dermapen");
  lot(membrana, "MB-31", 400, 9, "Kavo");

  // serviços
  const svc = (name, category, minutes, price) =>
    insert("INSERT INTO services (name, category, minutes, price_cents) VALUES (?,?,?,?)", name, category, minutes, price);

  const toxinaSvc = svc("Toxina botulínica — 1 região", "Injetáveis", 30, 120000);
  const preenchSvc = svc("Preenchimento labial 1ml", "Injetáveis", 60, 240000);
  const limpezaSvc = svc("Limpeza de pele profunda", "Facial", 60, 28000);
  const peelingSvc = svc("Peeling químico médio", "Facial", 45, 45000);
  const crioSvc = svc("Criolipólise — 1 área", "Corpo", 90, 90000);
  const microSvc = svc("Microagulhamento facial", "Facial", 60, 55000);
  const laserSvc = svc("Laser CO2 fracionado — face", "Facial", 90, 180000);
  const skinSvc = svc("Skinbooster — 1 sessão", "Injetáveis", 45, 110000);

  const mat = (service_id, product_id, qty) =>
    insert("INSERT INTO service_materials (service_id, product_id, qty) VALUES (?,?,?)", service_id, product_id, qty);

  mat(toxinaSvc, toxina, 0.25);
  mat(toxinaSvc, seringa, 1);
  mat(toxinaSvc, agulha, 2);
  mat(toxinaSvc, luva, 2);
  mat(toxinaSvc, gaze, 3);

  mat(preenchSvc, ah, 1);
  mat(preenchSvc, seringa, 1);
  mat(preenchSvc, agulha, 2);
  mat(preenchSvc, luva, 2);

  mat(limpezaSvc, gaze, 10);
  mat(limpezaSvc, luva, 2);
  mat(limpezaSvc, anestesico, 0.2);

  mat(peelingSvc, gaze, 4);
  mat(peelingSvc, luva, 2);
  mat(peelingSvc, anestesico, 0.2);

  mat(crioSvc, membrana, 1);
  mat(crioSvc, luva, 2);

  mat(microSvc, ponteira, 1);
  mat(microSvc, luva, 2);
  mat(microSvc, anestesico, 0.3);

  mat(laserSvc, ponteira, 1);
  mat(laserSvc, anestesico, 0.3);
  mat(laserSvc, gaze, 5);

  mat(skinSvc, ah, 1);
  mat(skinSvc, seringa, 1);
  mat(skinSvc, luva, 2);

  // pacientes
  const pat = (name, phone, email, cpf, birth, notes) =>
    insert(
      "INSERT INTO patients (name, phone, email, cpf, birth, notes, created_at) VALUES (?,?,?,?,?,?,?)",
      name, phone, email, cpf, birth, notes, now
    );

  const ana = pat("Ana Beatriz Rocha", "(11) 98812-4477", "ana.rocha@email.com", "412.883.910-22", "1991-04-12", "Alergia a lidocaína. Prefere atendimento pela manhã.");
  const juliana = pat("Juliana Prado", "(11) 99145-2210", "ju.prado@email.com", "318.442.701-09", "1986-09-30", "Pós-gestação, amamentando até jan/2027.");
  const marcos = pat("Marcos Vinícius Alves", "(11) 97733-8890", "marcos.va@email.com", "290.117.334-55", "1983-02-17", "Faz laser para cicatriz de acne.");
  const helena = pat("Helena Castro", "(11) 98120-7745", "helena.c@email.com", "377.902.118-40", "1995-11-05", "Pele sensível, histórico de melasma.");
  const patricia = pat("Patrícia Nunes", "(11) 99631-0044", "pati.nunes@email.com", "455.203.887-12", "1979-07-21", "Pacote de criolipólise em andamento.");
  const larissa = pat("Larissa Mendes", "(11) 98477-6621", "lari.mendes@email.com", "503.771.229-88", "1998-06-08", "Primeira avaliação agendada.");

  // orçamentos
  const quote = (patient_id, professional_id, status, days, subtotal, discount, notes) => {
    const total = subtotal - discount;
    return insert(
      `INSERT INTO quotes (number, patient_id, professional_id, status, valid_until, subtotal_cents,
        discount_cents, total_cents, notes, created_at, approved_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      nextQuoteNumber(), patient_id, professional_id, status, addDays(today, days),
      subtotal, discount, total, notes, now, (status === "aprovado" || status === "convertido") ? now : null
    );
  };

  const qLaser = quote(ana, profs[0], "convertido", 10, 540000, 60000, "Pacote de 3 sessões de laser CO2 para cicatriz de acne.");
  insert("INSERT INTO quote_items (quote_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
    qLaser, laserSvc, 3, 160000, 480000);

  const qTox = quote(helena, profs[0], "convertido", 10, 148000, 0, "Toxina + limpeza no mesmo dia.");
  insert("INSERT INTO quote_items (quote_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
    qTox, toxinaSvc, 1, 120000, 120000);
  insert("INSERT INTO quote_items (quote_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
    qTox, limpezaSvc, 1, 28000, 28000);

  const qPreench = quote(juliana, profs[2], "convertido", 10, 240000, 0, "Preenchimento labial — avaliação presencial.");
  insert("INSERT INTO quote_items (quote_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
    qPreench, preenchSvc, 1, 240000, 240000);

  const qCrio = quote(patricia, profs[1], "enviado", 12, 360000, 30000, "4 sessões de criolipólise — abdômen.");
  insert("INSERT INTO quote_items (quote_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
    qCrio, crioSvc, 4, 90000, 360000);

  quote(larissa, profs[1], "rascunho", 15, 55000, 0, "Avaliação inicial — microagulhamento.");

  const qLost = quote(marcos, profs[0], "recusado", 20, 450000, 0, "Peeling + laser.");
  insert("INSERT INTO quote_items (quote_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
    qLost, peelingSvc, 1, 45000, 45000);
  db.prepare("UPDATE quotes SET lost_reason = ? WHERE id = ?").run("Preço acima do orçado pelo paciente", qLost);

  // vendas
  const sale = (quote_id, patient_id, total, kind, daysAgo) =>
    insert("INSERT INTO sales (quote_id, patient_id, total_cents, kind, created_at) VALUES (?,?,?,?,?)",
      quote_id, patient_id, total, kind, addDays(today, -daysAgo) + "T10:00:00");

  const sLaser = sale(qLaser, ana, 480000, "pacote", 12);
  const siLaser = insert(
    "INSERT INTO sale_items (sale_id, service_id, qty_sessions, unit_cents, total_cents, sessions_done, revenue_recognized_cents) VALUES (?,?,?,?,?,?,?)",
    sLaser, laserSvc, 3, 160000, 480000, 1, 160000);

  const sTox = sale(qTox, helena, 148000, "avulso", 6);
  const siTox = insert(
    "INSERT INTO sale_items (sale_id, service_id, qty_sessions, unit_cents, total_cents, sessions_done, revenue_recognized_cents) VALUES (?,?,?,?,?,?,?)",
    sTox, toxinaSvc, 1, 120000, 120000, 1, 120000);
  const siLimpeza = insert("INSERT INTO sale_items (sale_id, service_id, qty_sessions, unit_cents, total_cents, sessions_done, revenue_recognized_cents) VALUES (?,?,?,?,?,?,?)",
    sTox, limpezaSvc, 1, 28000, 28000, 1, 28000);
  const sPreench = sale(qPreench, juliana, 240000, "avulso", 3);
  insert("INSERT INTO sale_items (sale_id, service_id, qty_sessions, unit_cents, total_cents, sessions_done, revenue_recognized_cents) VALUES (?,?,?,?,?,?,?)",
    sPreench, preenchSvc, 1, 240000, 240000, 0, 0);

  // recebíveis
  const recv = (sale_id, patient_id, seq, due, amount, paid) =>
    insert("INSERT INTO receivables (sale_id, patient_id, seq, due_date, amount_cents, paid_cents, status) VALUES (?,?,?,?,?,?,?)",
      sale_id, patient_id, seq, due, amount, paid, paid >= amount ? "pago" : paid > 0 ? "parcial" : "aberto");

  recv(sLaser, ana, 1, addDays(today, -13), 160000, 160000);
  recv(sLaser, ana, 2, addDays(today, 17), 160000, 0);
  recv(sLaser, ana, 3, addDays(today, 47), 160000, 0);

  recv(sTox, helena, 1, addDays(today, -6), 148000, 148000);

  recv(sPreench, juliana, 1, addDays(today, -8), 120000, 0);
  recv(sPreench, juliana, 2, addDays(today, 22), 120000, 0);

  // pagamentos
  const pay = (receivable_id, amount, method, daysAgo, fee = 0) =>
    insert("INSERT INTO payments (receivable_id, amount_cents, fee_cents, method, paid_at) VALUES (?,?,?,?,?)",
      receivable_id, amount, fee, method, addDays(today, -daysAgo) + "T15:20:00");

  const r1 = db.prepare("SELECT id FROM receivables WHERE sale_id = ? AND seq = 1").get(sLaser).id;
  const r2 = db.prepare("SELECT id FROM receivables WHERE sale_id = ? AND seq = 1").get(sTox).id;
  pay(r1, 160000, "PIX", 13);
  pay(r2, 148000, "Cartão de crédito", 6, 3700);

  // contas a pagar
  const ap = (supplier, category, due, amount, paid) =>
    insert("INSERT INTO payables (supplier, category, due_date, amount_cents, paid_cents, status) VALUES (?,?,?,?,?,?)",
      supplier, category, due, amount, paid, paid >= amount ? "pago" : "aberto");

  ap("Imobiliária Prime", "Aluguel", addDays(today, 5), 1500000, 0);
  ap("Allergan", "Insumos", addDays(today, -4), 420000, 420000);
  ap("Energia Elétrica", "Utilidades", addDays(today, 9), 78000, 0);
  ap("Agência Fluxo", "Marketing", addDays(today, 12), 250000, 0);
  ap("Contabilidade Silva", "Serviços", addDays(today, 3), 120000, 0);

  // agenda da semana
  const appt = (patient_id, professional_id, service_id, dayOffset, time, duration, status, sale_item_id = null) =>
    insert(
      "INSERT INTO appointments (patient_id, professional_id, service_id, sale_item_id, starts_at, duration_min, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
      patient_id, professional_id, service_id, sale_item_id, addDays(today, dayOffset) + "T" + time, duration, status, now
    );

  const a1 = appt(ana, profs[0], laserSvc, 0, "09:00", 90, "confirmado", siLaser);
  appt(helena, profs[0], toxinaSvc, 0, "11:00", 30, "agendado", null);
  appt(patricia, profs[1], crioSvc, 0, "14:00", 90, "agendado", null);
  appt(larissa, profs[1], microSvc, 0, "16:30", 60, "agendado", null);
  appt(marcos, profs[0], laserSvc, 1, "10:00", 90, "agendado", null);
  appt(juliana, profs[2], preenchSvc, 1, "15:00", 60, "confirmado", null);
  appt(ana, profs[0], laserSvc, 2, "09:00", 90, "agendado", siLaser);
  appt(helena, profs[0], limpezaSvc, 3, "10:30", 60, "agendado", null);
  appt(patricia, profs[1], crioSvc, 4, "14:00", 90, "agendado", null);

  // atendimentos fechados no mês (receita reconhecida + comissão)
  const closed = (appointment_id, patient_id, professional_id, service_id, sale_item_id, daysAgo, revenue) => {
    const enc = insert(
      "INSERT INTO encounters (appointment_id, patient_id, professional_id, status, notes, opened_at, closed_at) VALUES (?,?,?,?,?,?,?)",
      appointment_id, patient_id, professional_id, "fechado",
      "Procedimento realizado sem intercorrências.",
      addDays(today, -daysAgo) + "T09:00:00", addDays(today, -daysAgo) + "T10:30:00"
    );
    if (sale_item_id) {
      const si = db.prepare("SELECT * FROM sale_items WHERE id = ?").get(sale_item_id);
      const pct = db.prepare("SELECT commission_pct FROM professionals WHERE id = ?").get(professional_id).commission_pct;
      insert("INSERT INTO commission_entries (professional_id, sale_item_id, encounter_id, base_cents, amount_cents, period, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
        professional_id, sale_item_id, enc, revenue, Math.round(revenue * pct / 100), monthKey(addDays(today, -daysAgo)), "liberado", now);
    }
    insert("INSERT INTO revenue_entries (encounter_id, sale_item_id, amount_cents, period, created_at) VALUES (?,?,?,?,?)",
      enc, sale_item_id, revenue, monthKey(addDays(today, -daysAgo)), now);
    return enc;
  };

  closed(null, ana, profs[0], laserSvc, siLaser, 12, 160000);
  const encTox = closed(null, helena, profs[0], toxinaSvc, siTox, 6, 120000);

  // a limpeza foi executada no mesmo atendimento, mas é outro item da venda
  insert("INSERT INTO revenue_entries (encounter_id, sale_item_id, amount_cents, period, created_at) VALUES (?,?,?,?,?)",
    encTox, siLimpeza, 28000, monthKey(addDays(today, -6)), now);
  insert("INSERT INTO commission_entries (professional_id, sale_item_id, encounter_id, base_cents, amount_cents, period, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
    profs[0], siLimpeza, encTox, 28000, 2800, monthKey(addDays(today, -6)), "liberado", now);

  // atendimento de hoje em aberto
  insert("INSERT INTO encounters (appointment_id, patient_id, professional_id, status, opened_at) VALUES (?,?,?,?,?)",
    a1, ana, profs[0], "aberto", today + "T09:05:00");
  db.prepare("UPDATE appointments SET status = 'em_atendimento' WHERE id = ?").run(a1);

  // histórico de receita dos meses anteriores (para tendência no painel)
  const hist = (daysAgo, amount) =>
    insert("INSERT INTO revenue_entries (encounter_id, sale_item_id, amount_cents, period, created_at) VALUES (?,?,?,?,?)",
      null, null, amount, monthKey(addDays(today, -daysAgo)), now);
  hist(40, 210000);
  hist(70, 185000);
  hist(100, 168000);
  hist(130, 152000);

  // um movimento de estoque do atendimento fechado (para histórico)
  insert("INSERT INTO stock_moves (product_id, lot_id, kind, qty, reason, created_at) VALUES (?,?,?,?,?,?)",
    toxina, 1, "saida", 0.25, "Atendimento #2", addDays(today, -6) + "T10:00:00");
}

export function nextQuoteNumber() {
  const row = db.prepare("SELECT COALESCE(MAX(number), 0) + 1 AS n FROM quotes").get();
  return row.n;
}

export function getSetting(key, fallback = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, String(value));
}

seed();
