// Regras de negócio da clínica — o coração do sistema.
import {
  db, todayISO, addDays, monthKey, nextQuoteNumber, getSetting,
} from "./db.js";

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const tx = (fn) => {
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
};

const insert = (sql, ...args) => Number(db.prepare(sql).run(...args).lastInsertRowid);

// ---------------------------------------------------------------- preços e custo

export function serviceCost(serviceId) {
  const s = db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId);
  if (!s) return { materials: 0, room: 0, prof: 0, total: 0 };
  const mats = db
    .prepare(
      `SELECT sm.qty, p.cost_cents FROM service_materials sm
       JOIN products p ON p.id = sm.product_id WHERE sm.service_id = ?`
    )
    .all(serviceId);
  const materials = mats.reduce((acc, m) => acc + Math.round(m.qty * m.cost_cents), 0);
  const hours = s.minutes / 60;
  const room = Math.round(num(getSetting("room_hour_cents", 4000)) * hours);
  const prof = Math.round(num(getSetting("prof_hour_cents", 12000)) * hours);
  return { materials, room, prof, total: materials + room + prof };
}

export function listServices() {
  const rows = db.prepare("SELECT * FROM services WHERE active = 1 ORDER BY category, name").all();
  return rows.map((s) => {
    const cost = serviceCost(s.id);
    const margin = s.price_cents > 0 ? (s.price_cents - cost.total) / s.price_cents : 0;
    const mats = db
      .prepare(
        `SELECT p.name, p.unit, p.cost_cents, sm.qty FROM service_materials sm
         JOIN products p ON p.id = sm.product_id WHERE sm.service_id = ?`
      )
      .all(s.id);
    return { ...s, cost, margin, mats };
  });
}

export function updateServicePrice(id, priceCents) {
  db.prepare("UPDATE services SET price_cents = ? WHERE id = ?").run(Math.max(0, Math.round(priceCents)), id);
}

// ---------------------------------------------------------------- pacientes

export const listPatients = (q = "") => {
  const like = `%${q.trim()}%`;
  return db
    .prepare(
      `SELECT p.*,
        (SELECT MAX(starts_at) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'atendido') AS last_visit,
        (SELECT COALESCE(SUM(amount_cents - paid_cents), 0) FROM receivables r WHERE r.patient_id = p.id AND r.status != 'pago') AS open_cents
       FROM patients p
       WHERE (? = '' OR p.name LIKE ? OR p.phone LIKE ? OR p.cpf LIKE ?)
       ORDER BY p.name`
    )
    .all(q.trim(), like, like, like);
};

export const getPatient = (id) => db.prepare("SELECT * FROM patients WHERE id = ?").get(id);

export function createPatient(data) {
  return insert(
    "INSERT INTO patients (name, phone, email, cpf, birth, notes, created_at) VALUES (?,?,?,?,?,?,?)",
    data.name?.trim(), data.phone || null, data.email || null, data.cpf || null,
    data.birth || null, data.notes || null, new Date().toISOString()
  );
}

export function patientDetail(id) {
  const patient = getPatient(id);
  if (!patient) return null;
  const quotes = db
    .prepare("SELECT * FROM quotes WHERE patient_id = ? ORDER BY created_at DESC")
    .all(id);
  const sales = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS items
       FROM sales s WHERE s.patient_id = ? ORDER BY s.created_at DESC`
    )
    .all(id);
  const receivables = db
    .prepare("SELECT * FROM receivables WHERE patient_id = ? ORDER BY due_date")
    .all(id);
  const appointments = db
    .prepare(
      `SELECT a.*, pr.name AS professional, sv.name AS service
       FROM appointments a
       JOIN professionals pr ON pr.id = a.professional_id
       LEFT JOIN services sv ON sv.id = a.service_id
       WHERE a.patient_id = ? ORDER BY a.starts_at DESC LIMIT 12`
    )
    .all(id);
  const encounters = db
    .prepare(
      `SELECT e.*, pr.name AS professional FROM encounters e
       JOIN professionals pr ON pr.id = e.professional_id
       WHERE e.patient_id = ? ORDER BY e.opened_at DESC LIMIT 12`
    )
    .all(id);
  const lifetime = db
    .prepare("SELECT COALESCE(SUM(p.amount_cents),0) AS v FROM payments p JOIN receivables r ON r.id = p.receivable_id WHERE r.patient_id = ?")
    .get(id).v;
  const sessions = db
    .prepare(
      `SELECT si.id, si.qty_sessions, si.sessions_done, si.revenue_recognized_cents, si.total_cents,
              sv.name AS service, s.created_at
       FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN services sv ON sv.id = si.service_id
       WHERE s.patient_id = ? ORDER BY s.created_at DESC`
    )
    .all(id);
  return { patient, quotes, sales, receivables, appointments, encounters, lifetime, sessions };
}

// ---------------------------------------------------------------- orçamentos

export function createQuote({ patient_id, professional_id, items, discount_cents = 0, notes = "", valid_days = 15 }) {
  const clean = (items || []).filter((i) => i.service_id && i.qty_sessions > 0);
  if (!patient_id || clean.length === 0) throw new Error("Selecione o paciente e ao menos um serviço.");

  const prepared = clean.map((i) => {
    const s = db.prepare("SELECT * FROM services WHERE id = ?").get(i.service_id);
    if (!s) throw new Error("Serviço inválido.");
    const qty = Math.max(1, Math.round(num(i.qty_sessions, 1)));
    return { service_id: s.id, qty, unit: s.price_cents, total: s.price_cents * qty };
  });
  const subtotal = prepared.reduce((a, i) => a + i.total, 0);
  const maxDiscount = Math.round(subtotal * 0.2);
  const discount = Math.min(Math.max(0, Math.round(num(discount_cents))), maxDiscount);
  const total = subtotal - discount;

  return tx(() => {
    const id = insert(
      `INSERT INTO quotes (number, patient_id, professional_id, status, valid_until, subtotal_cents,
        discount_cents, total_cents, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      nextQuoteNumber(), patient_id, professional_id || null, "enviado",
      addDays(todayISO(), Math.max(1, Math.round(num(valid_days, 15)))),
      subtotal, discount, total, notes || null, new Date().toISOString()
    );
    for (const i of prepared) {
      insert(
        "INSERT INTO quote_items (quote_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
        id, i.service_id, i.qty, i.unit, i.total
      );
    }
    return id;
  });
}

export function getQuote(id) {
  const quote = db
    .prepare(
      `SELECT q.*, p.name AS patient, pr.name AS professional
       FROM quotes q JOIN patients p ON p.id = q.patient_id
       LEFT JOIN professionals pr ON pr.id = q.professional_id
       WHERE q.id = ?`
    )
    .get(id);
  if (!quote) return null;
  const items = db
    .prepare(
      `SELECT qi.*, s.name AS service, s.minutes FROM quote_items qi
       JOIN services s ON s.id = qi.service_id WHERE qi.quote_id = ? ORDER BY qi.id`
    )
    .all(id);
  const sale = db.prepare("SELECT * FROM sales WHERE quote_id = ?").get(id);
  return { ...quote, items, sale };
}

export const listQuotes = (status = "todos") => {
  const where = status === "todos" ? "" : "WHERE q.status = ?";
  return db
    .prepare(
      `SELECT q.*, p.name AS patient, pr.name AS professional
       FROM quotes q JOIN patients p ON p.id = q.patient_id
       LEFT JOIN professionals pr ON pr.id = q.professional_id
       ${where} ORDER BY q.created_at DESC`
    )
    .all(...(status === "todos" ? [] : [status]));
};

export function loseQuote(id, reason) {
  db.prepare("UPDATE quotes SET status = 'recusado', lost_reason = ? WHERE id = ?").run(reason || "Não informado", id);
}

export function quoteIsExpired(q) {
  return q.status === "enviado" && q.valid_until && q.valid_until < todayISO();
}

// Fecha a venda: gera recebíveis, marca o orçamento como convertido.
export function sellQuote(quoteId, { entrada_cents = 0, installments = 1, first_due, method = "PIX" }) {
  const quote = getQuote(quoteId);
  if (!quote) throw new Error("Orçamento não encontrado.");
  if (quote.status === "convertido") throw new Error("Orçamento já convertido em venda.");
  if (quote.sale) throw new Error("Já existe venda para este orçamento.");

  const total = quote.total_cents;
  const entrada = Math.min(Math.max(0, Math.round(num(entrada_cents))), total);
  const remaining = total - entrada;
  const n = remaining > 0 ? Math.max(1, Math.min(24, Math.round(num(installments, 1)))) : 0;
  const due = first_due || addDays(todayISO(), 30);

  return tx(() => {
    const kind = quote.items.some((i) => i.qty_sessions > 1) ? "pacote" : "avulso";
    const saleId = insert(
      "INSERT INTO sales (quote_id, patient_id, total_cents, kind, created_at) VALUES (?,?,?,?,?)",
      quoteId, quote.patient_id, total, kind, new Date().toISOString()
    );
    // o desconto do orçamento é rateado entre os itens: a soma dos itens precisa
    // fechar exatamente com o total contratado, senão a receita reconhecida mente.
    const itemsSubtotal = quote.items.reduce((acc, i) => acc + i.total_cents, 0);
    let allocated = 0;
    quote.items.forEach((i, idx) => {
      const isLast = idx === quote.items.length - 1;
      const itemTotal = isLast ? total - allocated : Math.round((i.total_cents * total) / itemsSubtotal);
      allocated += itemTotal;
      insert(
        "INSERT INTO sale_items (sale_id, service_id, qty_sessions, unit_cents, total_cents) VALUES (?,?,?,?,?)",
        saleId, i.service_id, i.qty_sessions, Math.round(itemTotal / i.qty_sessions), itemTotal
      );
    });
    let seq = 0;
    if (entrada > 0) {
      seq += 1;
      insert(
        "INSERT INTO receivables (sale_id, patient_id, seq, due_date, amount_cents) VALUES (?,?,?,?,?)",
        saleId, quote.patient_id, seq, todayISO(), entrada
      );
    }
    if (n > 0) {
      const per = Math.floor(remaining / n);
      for (let k = 0; k < n; k++) {
        const amount = k === n - 1 ? remaining - per * (n - 1) : per;
        seq += 1;
        insert(
          "INSERT INTO receivables (sale_id, patient_id, seq, due_date, amount_cents) VALUES (?,?,?,?,?)",
          saleId, quote.patient_id, seq, addDays(due, 30 * k), amount
        );
      }
    }
    db.prepare("UPDATE quotes SET status = 'convertido', approved_at = ? WHERE id = ?").run(new Date().toISOString(), quoteId);
    return saleId;
  });
}

// ---------------------------------------------------------------- vendas

export function getSale(id) {
  const sale = db
    .prepare(
      `SELECT s.*, p.name AS patient, q.discount_cents
       FROM sales s JOIN patients p ON p.id = s.patient_id
       LEFT JOIN quotes q ON q.id = s.quote_id
       WHERE s.id = ?`
    )
    .get(id);
  if (!sale) return null;
  const items = db
    .prepare(
      `SELECT si.*, sv.name AS service, sv.minutes FROM sale_items si
       JOIN services sv ON sv.id = si.service_id WHERE si.sale_id = ? ORDER BY si.id`
    )
    .all(id);
  const receivables = db
    .prepare("SELECT * FROM receivables WHERE sale_id = ? ORDER BY seq")
    .all(id);
  const deferred = items.reduce((a, i) => a + (i.total_cents - i.revenue_recognized_cents), 0);
  const recognized = items.reduce((a, i) => a + i.revenue_recognized_cents, 0);
  return { ...sale, items, receivables, deferred, recognized };
}

export const listSales = () =>
  db
    .prepare(
      `SELECT s.*, p.name AS patient,
        (SELECT COALESCE(SUM(si.revenue_recognized_cents),0) FROM sale_items si WHERE si.sale_id = s.id) AS recognized
       FROM sales s JOIN patients p ON p.id = s.patient_id ORDER BY s.created_at DESC`
    )
    .all();

// ---------------------------------------------------------------- agenda e atendimento

export const weekStart = (iso) => {
  const d = new Date((iso || todayISO()) + "T12:00:00");
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function agenda(startISO) {
  const start = weekStart(startISO);
  const end = addDays(start, 7);
  const rows = db
    .prepare(
      `SELECT a.*, p.name AS patient, pr.name AS professional, pr.color AS color,
              sv.name AS service, sv.minutes,
              e.id AS encounter_id, e.status AS encounter_status
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN professionals pr ON pr.id = a.professional_id
       LEFT JOIN services sv ON sv.id = a.service_id
       LEFT JOIN encounters e ON e.appointment_id = a.id
       WHERE a.starts_at >= ? AND a.starts_at < ?
       ORDER BY a.starts_at`
    )
    .all(start + "T00:00", end + "T00:00");
  const days = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDays(start, i);
    days.push({ iso, items: rows.filter((r) => r.starts_at.slice(0, 10) === iso) });
  }
  return { start, end, days, total: rows.length };
}

export const listProfessionals = () => db.prepare("SELECT * FROM professionals WHERE active = 1 ORDER BY name").all();

export function createAppointment({ patient_id, professional_id, service_id, date, time, duration_min, sale_item_id = null }) {
  if (!patient_id || !professional_id || !date || !time) throw new Error("Preencha paciente, profissional, data e hora.");
  const starts = `${date}T${time}`;
  const svc = service_id ? db.prepare("SELECT * FROM services WHERE id = ?").get(service_id) : null;
  const duration = Math.max(15, Math.round(num(duration_min, svc ? svc.minutes : 60)));
  const end = addMinutes(starts, duration);
  const conflict = db
    .prepare(
      `SELECT a.*, p.name AS patient FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE a.professional_id = ? AND a.status NOT IN ('cancelado','faltou')
         AND a.starts_at < ? AND datetime(a.starts_at, '+' || a.duration_min || ' minutes') > ?`
    )
    .get(professional_id, end, starts);
  if (conflict) throw new Error(`Conflito de agenda com ${conflict.patient} às ${conflict.starts_at.slice(11, 16)}.`);
  return insert(
    "INSERT INTO appointments (patient_id, professional_id, service_id, sale_item_id, starts_at, duration_min, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
    patient_id, professional_id, service_id || null, sale_item_id || null, starts, duration, "agendado", new Date().toISOString()
  );
}

function addMinutes(isoLocal, minutes) {
  const d = new Date(isoLocal + ":00");
  d.setMinutes(d.getMinutes() + minutes);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function setAppointmentStatus(id, status) {
  db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
}

export function startEncounter(appointmentId) {
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(appointmentId);
  if (!appt) throw new Error("Agendamento não encontrado.");
  const existing = db
    .prepare("SELECT * FROM encounters WHERE appointment_id = ? AND status = 'aberto'")
    .get(appointmentId);
  if (existing) return existing.id;
  const id = insert(
    "INSERT INTO encounters (appointment_id, patient_id, professional_id, status, opened_at) VALUES (?,?,?,?,?)",
    appointmentId, appt.patient_id, appt.professional_id, "aberto",
    `${todayISO()}T${new Date().toTimeString().slice(0, 5)}`
  );
  db.prepare("UPDATE appointments SET status = 'em_atendimento' WHERE id = ?").run(appointmentId);
  return id;
}

export function getEncounter(id) {
  const enc = db
    .prepare(
      `SELECT e.*, p.name AS patient, pr.name AS professional,
              a.starts_at, a.service_id, a.sale_item_id, sv.name AS service, sv.price_cents
       FROM encounters e
       JOIN patients p ON p.id = e.patient_id
       JOIN professionals pr ON pr.id = e.professional_id
       LEFT JOIN appointments a ON a.id = e.appointment_id
       LEFT JOIN services sv ON sv.id = a.service_id
       WHERE e.id = ?`
    )
    .get(id);
  if (!enc) return null;
  const materials = enc.service_id ? encounterMaterials(enc.service_id) : [];
  const used = db
    .prepare(
      `SELECT em.*, p.name AS product, sl.lot FROM encounter_materials em
       JOIN products p ON p.id = em.product_id
       LEFT JOIN stock_lots sl ON sl.id = em.lot_id
       WHERE em.encounter_id = ?`
    )
    .all(id);
  return { ...enc, materials, used };
}

export function encounterMaterials(serviceId) {
  const rows = db
    .prepare(
      `SELECT sm.product_id, sm.qty, p.name, p.unit, p.cost_cents,
              (SELECT id FROM stock_lots l WHERE l.product_id = sm.product_id AND l.qty > 0
               ORDER BY l.expires_on LIMIT 1) AS suggested_lot
       FROM service_materials sm JOIN products p ON p.id = sm.product_id
       WHERE sm.service_id = ?`
    )
    .all(serviceId);
  return rows.map((r) => {
    const lot = r.suggested_lot
      ? db.prepare("SELECT * FROM stock_lots WHERE id = ?").get(r.suggested_lot)
      : null;
    return { ...r, lot, available: lot ? lot.qty : 0, cost: Math.round(r.qty * r.cost_cents) };
  });
}

export function closeEncounter(encounterId, { notes = "", materials = [] }) {
  const enc = db.prepare("SELECT * FROM encounters WHERE id = ?").get(encounterId);
  if (!enc) throw new Error("Atendimento não encontrado.");
  if (enc.status === "fechado") throw new Error("Atendimento já encerrado.");
  const appt = enc.appointment_id
    ? db.prepare("SELECT * FROM appointments WHERE id = ?").get(enc.appointment_id)
    : null;

  return tx(() => {
    // 1. baixa de estoque (FEFO)
    for (const m of materials) {
      const qty = num(m.qty);
      if (!m.product_id || qty <= 0) continue;
      let remaining = qty;
      const unit = num(m.unit_cents);
      const lots = db
        .prepare("SELECT * FROM stock_lots WHERE product_id = ? AND qty > 0 ORDER BY expires_on")
        .all(m.product_id);
      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(lot.qty, remaining);
        db.prepare("UPDATE stock_lots SET qty = qty - ? WHERE id = ?").run(take, lot.id);
        db.prepare(
          "INSERT INTO stock_moves (product_id, lot_id, kind, qty, reason, encounter_id, created_at) VALUES (?,?,?,?,?,?,?)"
        ).run(m.product_id, lot.id, "saida", take, "Consumo em atendimento", encounterId, new Date().toISOString());
        insert(
          "INSERT INTO encounter_materials (encounter_id, product_id, lot_id, qty, cost_cents) VALUES (?,?,?,?,?)",
          encounterId, m.product_id, lot.id, take, Math.round(take * unit)
        );
        remaining -= take;
      }
      if (remaining > 0) {
        db.prepare(
          "INSERT INTO stock_moves (product_id, lot_id, kind, qty, reason, encounter_id, created_at) VALUES (?,?,?,?,?,?,?)"
        ).run(m.product_id, null, "saida", remaining, "Sem lote disponível", encounterId, new Date().toISOString());
      }
    }

    // 2. receita reconhecida e comissão
    if (appt && appt.sale_item_id) {
      const item = db.prepare("SELECT * FROM sale_items WHERE id = ?").get(appt.sale_item_id);
      if (item.sessions_done < item.qty_sessions) {
        const per = Math.floor(item.total_cents / item.qty_sessions);
        const isLast = item.sessions_done + 1 === item.qty_sessions;
        const amount = isLast ? item.total_cents - item.revenue_recognized_cents : per;
        db.prepare(
          "UPDATE sale_items SET sessions_done = sessions_done + 1, revenue_recognized_cents = revenue_recognized_cents + ? WHERE id = ?"
        ).run(amount, item.id);
        const period = monthKey(todayISO());
        insert(
          "INSERT INTO revenue_entries (encounter_id, sale_item_id, amount_cents, period, created_at) VALUES (?,?,?,?,?)",
          encounterId, item.id, amount, period, new Date().toISOString()
        );
        const pct = db.prepare("SELECT commission_pct FROM professionals WHERE id = ?").get(enc.professional_id)?.commission_pct ?? 0;
        insert(
          "INSERT INTO commission_entries (professional_id, sale_item_id, encounter_id, base_cents, amount_cents, period, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
          enc.professional_id, item.id, encounterId, amount, Math.round((amount * pct) / 100), period, "liberado", new Date().toISOString()
        );
      }
    }

    // 3. fecha
    db.prepare("UPDATE encounters SET status = 'fechado', notes = ?, closed_at = ? WHERE id = ?")
      .run(notes, new Date().toISOString(), encounterId);
    if (appt) db.prepare("UPDATE appointments SET status = 'atendido' WHERE id = ?").run(appt.id);
    return true;
  });
}

// ---------------------------------------------------------------- financeiro

export const METHOD_FEES = {
  PIX: 0,
  Dinheiro: 0,
  "Cartão de débito": 1.5,
  "Cartão de crédito": num(getSetting("card_fee_pct", 2.5)),
  Transferência: 0,
  Boleto: 0,
};

export function receivePayment(receivableId, { amount_cents, method = "PIX" }) {
  const r = db.prepare("SELECT * FROM receivables WHERE id = ?").get(receivableId);
  if (!r) throw new Error("Título não encontrado.");
  const open = r.amount_cents - r.paid_cents;
  const amount = Math.min(Math.max(1, Math.round(num(amount_cents, open))), open);
  const feePct = METHOD_FEES[method] ?? 0;
  const fee = Math.round((amount * feePct) / 100);
  return tx(() => {
    insert(
      "INSERT INTO payments (receivable_id, amount_cents, fee_cents, method, paid_at) VALUES (?,?,?,?,?)",
      receivableId, amount, fee, method, new Date().toISOString()
    );
    const newPaid = r.paid_cents + amount;
    db.prepare("UPDATE receivables SET paid_cents = ?, status = ? WHERE id = ?")
      .run(newPaid, newPaid >= r.amount_cents ? "pago" : "parcial", receivableId);
    return true;
  });
}

export function payPayable(id) {
  const p = db.prepare("SELECT * FROM payables WHERE id = ?").get(id);
  if (!p) throw new Error("Conta não encontrada.");
  db.prepare("UPDATE payables SET paid_cents = amount_cents, status = 'pago' WHERE id = ?").run(id);
}

export function finances({ tab = "receber", filter = "todos" } = {}) {
  const today = todayISO();
  let where = "";
  if (filter === "abertos") where = "AND r.status != 'pago'";
  else if (filter === "vencidos") where = "AND r.status != 'pago' AND r.due_date < '" + today + "'";
  else if (filter === "pagos") where = "AND r.status = 'pago'";
  const receivables = db
    .prepare(
      `SELECT r.*, p.name AS patient, s.kind FROM receivables r
       JOIN patients p ON p.id = r.patient_id
       LEFT JOIN sales s ON s.id = r.sale_id
       WHERE 1=1 ${where} ORDER BY r.due_date LIMIT 200`
    )
    .all();
  const payables = db.prepare("SELECT * FROM payables ORDER BY due_date LIMIT 200").all();
  const openTotal = db
    .prepare("SELECT COALESCE(SUM(amount_cents - paid_cents),0) AS v FROM receivables WHERE status != 'pago'")
    .get().v;
  const overdueTotal = db
    .prepare("SELECT COALESCE(SUM(amount_cents - paid_cents),0) AS v FROM receivables WHERE status != 'pago' AND due_date < ?")
    .get(today).v;
  const paidToday = db
    .prepare("SELECT COALESCE(SUM(amount_cents),0) AS v, COUNT(*) AS n FROM payments WHERE paid_at LIKE ?")
    .get(today + "%");
  const byMethod = db
    .prepare("SELECT method, SUM(amount_cents) AS v, COUNT(*) AS n FROM payments WHERE paid_at LIKE ? GROUP BY method")
    .all(today + "%");
  const toPay = db
    .prepare("SELECT COALESCE(SUM(amount_cents - paid_cents),0) AS v FROM payables WHERE status != 'pago'")
    .get().v;
  return { tab, filter, receivables, payables, openTotal, overdueTotal, paidToday, byMethod, toPay, today };
}

export function cashFlow(days = 30) {
  const start = todayISO();
  const end = addDays(start, days);
  const inflow = db
    .prepare("SELECT due_date AS d, SUM(amount_cents - paid_cents) AS v FROM receivables WHERE status != 'pago' AND due_date BETWEEN ? AND ? GROUP BY due_date")
    .all(start, end);
  const outflow = db
    .prepare("SELECT due_date AS d, SUM(amount_cents - paid_cents) AS v FROM payables WHERE status != 'pago' AND due_date BETWEEN ? AND ? GROUP BY due_date")
    .all(start, end);
  return { inflow, outflow };
}

// ---------------------------------------------------------------- comissões

export function commissions(period = monthKey(todayISO())) {
  const rows = db
    .prepare(
      `SELECT c.*, pr.name AS professional, pr.role, sv.name AS service
       FROM commission_entries c
       JOIN professionals pr ON pr.id = c.professional_id
       LEFT JOIN sale_items si ON si.id = c.sale_item_id
       LEFT JOIN services sv ON sv.id = si.service_id
       WHERE c.period = ? ORDER BY pr.name, c.created_at DESC`
    )
    .all(period);
  const byProf = {};
  for (const r of rows) {
    byProf[r.professional] = byProf[r.professional] || { name: r.professional, role: r.role, total: 0, pending: 0, rows: [] };
    byProf[r.professional].total += r.amount_cents;
    if (r.status === "liberado") byProf[r.professional].pending += r.amount_cents;
    byProf[r.professional].rows.push(r);
  }
  return { period, rows, byProf: Object.values(byProf) };
}

export function payCommissions(professionalName, period) {
  db.prepare(
    `UPDATE commission_entries SET status = 'pago'
     WHERE period = ? AND professional_id = (SELECT id FROM professionals WHERE name = ?)`
  ).run(period, professionalName);
}

// ---------------------------------------------------------------- estoque

export function stockOverview() {
  const products = db
    .prepare(
      `SELECT p.*, COALESCE((SELECT SUM(qty) FROM stock_lots WHERE product_id = p.id), 0) AS stock
       FROM products p ORDER BY p.name`
    )
    .all();
  const lots = db
    .prepare(
      `SELECT l.*, p.name AS product FROM stock_lots l JOIN products p ON p.id = l.product_id
       ORDER BY l.expires_on`
    )
    .all();
  const moves = db
    .prepare(
      `SELECT m.*, p.name AS product FROM stock_moves m JOIN products p ON p.id = m.product_id
       ORDER BY m.created_at DESC LIMIT 30`
    )
    .all();
  const today = todayISO();
  return {
    products: products.map((p) => ({
      ...p,
      status: p.stock <= 0 ? "zerado" : p.stock <= p.min_stock ? "baixo" : "ok",
    })),
    lots: lots.map((l) => ({ ...l, expired: l.expires_on < today, expiring: !l.expired && l.expires_on <= addDays(today, 30) })),
    moves,
  };
}

export function addStock({ product_id, lot, expires_on, qty, supplier, cost_cents }) {
  const q = num(qty);
  if (!product_id || q <= 0) throw new Error("Informe produto e quantidade.");
  return tx(() => {
    if (cost_cents) db.prepare("UPDATE products SET cost_cents = ? WHERE id = ?").run(Math.round(num(cost_cents)), product_id);
    const lotId = insert(
      "INSERT INTO stock_lots (product_id, lot, expires_on, qty, qty_initial, supplier) VALUES (?,?,?,?,?,?)",
      product_id, lot || null, expires_on || null, q, q, supplier || null
    );
    insert(
      "INSERT INTO stock_moves (product_id, lot_id, kind, qty, reason, created_at) VALUES (?,?,?,?,?,?)",
      product_id, lotId, "entrada", q, "Entrada manual", new Date().toISOString()
    );
    return lotId;
  });
}

export const listProducts = () => db.prepare("SELECT * FROM products ORDER BY name").all();

// ---------------------------------------------------------------- painel

export function dashboard() {
  const today = todayISO();
  const period = monthKey(today);
  const revenueMonth = db
    .prepare("SELECT COALESCE(SUM(amount_cents),0) AS v FROM revenue_entries WHERE period = ?")
    .get(period).v;
  const revenuePrev = db
    .prepare("SELECT COALESCE(SUM(amount_cents),0) AS v FROM revenue_entries WHERE period = ?")
    .get(monthKey(addDays(today, -31))).v;
  const openCents = db
    .prepare("SELECT COALESCE(SUM(amount_cents - paid_cents),0) AS v FROM receivables WHERE status != 'pago'")
    .get().v;
  const overdue = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents - paid_cents),0) AS v, COUNT(*) AS n FROM receivables
       WHERE status != 'pago' AND due_date < ?`
    )
    .get(today);
  const quotesOpen = db
    .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS v FROM quotes WHERE status IN ('enviado','rascunho')")
    .get();
  const funnel = db
    .prepare("SELECT status, COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS v FROM quotes GROUP BY status")
    .all();
  const deferred = db
    .prepare("SELECT COALESCE(SUM(total_cents - revenue_recognized_cents),0) AS v FROM sale_items")
    .get().v;
  const commissionsPending = db
    .prepare("SELECT COALESCE(SUM(amount_cents),0) AS v FROM commission_entries WHERE status = 'liberado'")
    .get().v;
  const appointmentsToday = db
    .prepare(
      `SELECT a.*, p.name AS patient, pr.name AS professional, pr.color, sv.name AS service
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN professionals pr ON pr.id = a.professional_id
       LEFT JOIN services sv ON sv.id = a.service_id
       WHERE a.starts_at LIKE ? ORDER BY a.starts_at`
    )
    .all(today + "%");
  const recentPayments = db
    .prepare(
      `SELECT pay.*, p.name AS patient FROM payments pay
       JOIN receivables r ON r.id = pay.receivable_id
       JOIN patients p ON p.id = r.patient_id
       ORDER BY pay.paid_at DESC LIMIT 6`
    )
    .all();
  const series = db
    .prepare("SELECT period, SUM(amount_cents) AS v FROM revenue_entries GROUP BY period ORDER BY period DESC LIMIT 6")
    .all()
    .reverse();
  const expiring = db
    .prepare(
      `SELECT l.*, p.name AS product FROM stock_lots l JOIN products p ON p.id = l.product_id
       WHERE l.qty > 0 AND l.expires_on <= ? ORDER BY l.expires_on LIMIT 5`
    )
    .all(addDays(today, 30));
  const lowStock = db
    .prepare(
      `SELECT p.*, COALESCE((SELECT SUM(qty) FROM stock_lots WHERE product_id = p.id),0) AS stock
       FROM products p
       WHERE COALESCE((SELECT SUM(qty) FROM stock_lots WHERE product_id = p.id),0) <= p.min_stock
       ORDER BY stock LIMIT 5`
    )
    .all();
  return {
    period, revenueMonth, revenuePrev, openCents, overdue, quotesOpen, funnel, deferred,
    commissionsPending, appointmentsToday, recentPayments, series, expiring, lowStock, today,
  };
}
