// Servidor HTTP — sem frameworks, sem build.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { todayISO, monthKey } from "./db.js";
import * as dom from "./domain.js";
import * as ui from "./views.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = Number(process.env.PORT || 4321);

const MIME = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

// ---------------------------------------------------------------- helpers

const routes = [];
const add = (method, path, fn) => {
  const keys = [];
  const rx = new RegExp(
    "^" + path.replace(/:([A-Za-z_]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$"
  );
  routes.push({ method, rx, keys, fn });
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(body);
};

const redirect = (res, url, msg, type = "ok") => {
  const sep = url.includes("?") ? "&" : "?";
  const final = msg ? `${url}${sep}${type}=${encodeURIComponent(msg)}` : url;
  res.writeHead(303, { Location: final });
  res.end();
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2_000_000) return reject(new Error("Corpo da requisição muito grande."));
      data += chunk;
    });
    req.on("end", () => resolve(new URLSearchParams(data)));
    req.on("error", reject);
  });

export function parseMoney(value) {
  if (value == null || value === "") return 0;
  let s = String(value).trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  if (hasComma) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

const flashFrom = (query) => ({ ok: query.get("ok") || "", erro: query.get("erro") || "" });

// ---------------------------------------------------------------- rotas: painel

add("GET", "/", (req, res, p, query) => {
  send(res, 200, ui.dashboard(dom.dashboard()));
});

// ---------------------------------------------------------------- pacientes

add("GET", "/pacientes", (req, res, p, query) => {
  const q = query.get("q") || "";
  send(res, 200, ui.patientsPage({ rows: dom.listPatients(q), q, ...flashFrom(query) }));
});

add("GET", "/pacientes/novo", (req, res, p, query) => {
  send(res, 200, ui.patientFormPage({ ...flashFrom(query) }));
});

add("POST", "/pacientes", (req, res, p, query, form) => {
  const id = dom.createPatient({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
    cpf: form.get("cpf"),
    birth: form.get("birth"),
    notes: form.get("notes"),
  });
  redirect(res, `/pacientes/${id}`, "Paciente cadastrado.");
});

add("GET", "/pacientes/:id", (req, res, p, query) => {
  const data = dom.patientDetail(Number(p.id));
  if (!data) return send(res, 404, ui.layout({ title: "Não encontrado", body: "<p>Paciente não encontrado.</p>" }));
  send(res, 200, ui.patientDetailPage({ ...data, ...flashFrom(query) }));
});

// ---------------------------------------------------------------- serviços

add("GET", "/servicos", (req, res, p, query) => {
  send(res, 200, ui.servicesPage({ rows: dom.listServices(), ...flashFrom(query) }));
});

add("POST", "/servicos/:id/preco", (req, res, p, query, form) => {
  dom.updateServicePrice(Number(p.id), parseMoney(form.get("price")));
  redirect(res, "/servicos", "Preço atualizado.");
});

// ---------------------------------------------------------------- orçamentos

add("GET", "/orcamentos", (req, res, p, query) => {
  const status = query.get("status") || "todos";
  const all = dom.listQuotes("todos");
  const tabs = [
    ["todos", "Todos", all.length],
    ["enviado", "Enviados", all.filter((q) => q.status === "enviado").length],
    ["convertido", "Convertidos", all.filter((q) => q.status === "convertido").length],
    ["recusado", "Recusados", all.filter((q) => q.status === "recusado").length],
    ["rascunho", "Rascunhos", all.filter((q) => q.status === "rascunho").length],
  ];
  send(res, 200, ui.quotesPage({ rows: dom.listQuotes(status), status, tabs, ...flashFrom(query) }));
});

add("GET", "/orcamentos/novo", (req, res, p, query) => {
  send(
    res,
    200,
    ui.quoteFormPage({
      patients: dom.listPatients(),
      professionals: dom.listProfessionals(),
      services: dom.listServices(),
      patientId: query.get("paciente"),
      ...flashFrom(query),
    })
  );
});

add("POST", "/orcamentos", (req, res, p, query, form) => {
  const ids = form.getAll("service_id");
  const qtys = form.getAll("qty");
  const items = ids
    .map((id, i) => ({ service_id: Number(id), qty_sessions: Number(qtys[i] || 1) }))
    .filter((i) => i.service_id);
  const id = dom.createQuote({
    patient_id: Number(form.get("patient_id")),
    professional_id: form.get("professional_id") ? Number(form.get("professional_id")) : null,
    items,
    discount_cents: parseMoney(form.get("discount")),
    notes: form.get("notes") || "",
    valid_days: Number(form.get("valid_days") || 15),
  });
  redirect(res, `/orcamentos/${id}`, "Orçamento gerado.");
});

add("GET", "/orcamentos/:id", (req, res, p, query) => {
  const q = dom.getQuote(Number(p.id));
  if (!q) return send(res, 404, ui.layout({ title: "Não encontrado", body: "<p>Orçamento não encontrado.</p>" }));
  send(res, 200, ui.quoteDetailPage(q, dom.listProfessionals(), { ...flashFrom(query) }));
});

add("POST", "/orcamentos/:id/vender", (req, res, p, query, form) => {
  const saleId = dom.sellQuote(Number(p.id), {
    entrada_cents: parseMoney(form.get("entrada")),
    installments: Number(form.get("installments") || 1),
    first_due: form.get("first_due") || undefined,
    method: form.get("method") || "PIX",
  });
  redirect(res, `/vendas/${saleId}`, "Venda fechada e títulos gerados.");
});

add("POST", "/orcamentos/:id/recusar", (req, res, p, query, form) => {
  dom.loseQuote(Number(p.id), form.get("reason") || "Não informado");
  redirect(res, "/orcamentos", "Orçamento marcado como recusado.");
});

// ---------------------------------------------------------------- vendas

add("GET", "/vendas", (req, res, p, query) => {
  send(res, 200, ui.salesPage({ rows: dom.listSales(), ...flashFrom(query) }));
});

add("GET", "/vendas/:id", (req, res, p, query) => {
  const s = dom.getSale(Number(p.id));
  if (!s) return send(res, 404, ui.layout({ title: "Não encontrado", body: "<p>Venda não encontrada.</p>" }));
  send(res, 200, ui.saleDetailPage({ ...s, ...flashFrom(query) }));
});

// ---------------------------------------------------------------- agenda

add("GET", "/agenda", (req, res, p, query) => {
  const start = query.get("start") || todayISO();
  send(
    res,
    200,
    ui.agendaPage({
      week: dom.agenda(start),
      professionals: dom.listProfessionals(),
      services: dom.listServices(),
      patients: dom.listPatients(),
      novo: query.get("novo") === "1",
      selectedPatient: query.get("paciente"),
      selectedService: query.get("servico"),
      selectedItem: query.get("item"),
      ...flashFrom(query),
    })
  );
});

add("POST", "/agenda", (req, res, p, query, form) => {
  dom.createAppointment({
    patient_id: Number(form.get("patient_id")),
    professional_id: Number(form.get("professional_id")),
    service_id: form.get("service_id") ? Number(form.get("service_id")) : null,
    date: form.get("date"),
    time: form.get("time"),
    duration_min: Number(form.get("duration_min") || 60),
    sale_item_id: form.get("sale_item_id") ? Number(form.get("sale_item_id")) : null,
  });
  redirect(res, `/agenda?start=${form.get("date")}`, "Agendamento criado.");
});

add("POST", "/agenda/:id/iniciar", (req, res, p) => {
  const encounterId = dom.startEncounter(Number(p.id));
  redirect(res, `/atendimentos/${encounterId}`);
});

add("POST", "/agenda/:id/faltou", (req, res, p) => {
  dom.setAppointmentStatus(Number(p.id), "faltou");
  redirect(res, "/agenda", "Falta registrada.");
});

// ---------------------------------------------------------------- atendimento

add("GET", "/atendimentos/:id", (req, res, p, query) => {
  const e = dom.getEncounter(Number(p.id));
  if (!e) return send(res, 404, ui.layout({ title: "Não encontrado", body: "<p>Atendimento não encontrado.</p>" }));
  send(res, 200, ui.encounterPage({ ...e, ...flashFrom(query) }));
});

add("POST", "/atendimentos/:id/fechar", (req, res, p, query, form) => {
  const products = dom.listProducts();
  const materials = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("qty_")) continue;
    const productId = Number(key.slice(4));
    const product = products.find((x) => x.id === productId);
    materials.push({ product_id: productId, qty: Number(value), unit_cents: product ? product.cost_cents : 0 });
  }
  dom.closeEncounter(Number(p.id), { notes: form.get("notes") || "", materials });
  redirect(res, "/agenda", "Atendimento encerrado: receita e comissão lançadas.");
});

// ---------------------------------------------------------------- financeiro

add("GET", "/financeiro", (req, res, p, query) => {
  send(
    res,
    200,
    ui.financesPage({
      ...dom.finances({ tab: query.get("tab") || "receber", filter: query.get("filter") || "todos" }),
      ...flashFrom(query),
    })
  );
});

add("POST", "/financeiro/receber/:id", (req, res, p, query, form) => {
  dom.receivePayment(Number(p.id), { amount_cents: parseMoney(form.get("amount")), method: form.get("method") || "PIX" });
  redirect(res, query.get("back") || "/financeiro", "Recebimento registrado.");
});

add("POST", "/financeiro/pagar/:id", (req, res, p) => {
  dom.payPayable(Number(p.id));
  redirect(res, "/financeiro?tab=pagar", "Conta paga.");
});

// ---------------------------------------------------------------- comissões

add("GET", "/comissoes", (req, res, p, query) => {
  const period = query.get("period") || monthKey(todayISO());
  send(res, 200, ui.commissionsPage({ ...dom.commissions(period), ...flashFrom(query) }));
});

add("POST", "/comissoes/pagar", (req, res, p, query, form) => {
  dom.payCommissions(form.get("professional"), form.get("period"));
  redirect(res, `/comissoes?period=${form.get("period")}`, "Comissões pagas.");
});

// ---------------------------------------------------------------- estoque

add("GET", "/estoque", (req, res, p, query) => {
  send(res, 200, ui.stockPage({ ...dom.stockOverview(), ...flashFrom(query) }));
});

add("POST", "/estoque", (req, res, p, query, form) => {
  dom.addStock({
    product_id: Number(form.get("product_id")),
    lot: form.get("lot"),
    expires_on: form.get("expires_on"),
    qty: form.get("qty"),
    supplier: "Entrada manual",
    cost_cents: form.get("cost") ? parseMoney(form.get("cost")) : null,
  });
  redirect(res, "/estoque", "Entrada registrada.");
});

// ---------------------------------------------------------------- dispatch

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = decodeURIComponent(url.pathname);

    if (path.startsWith("/app.")) {
      const file = join(PUBLIC, path);
      const data = await readFile(file);
      res.writeHead(200, { "Content-Type": MIME[extname(file)] || "text/plain", "Cache-Control": "no-cache" });
      return res.end(data);
    }

    const route = routes.find((r) => r.method === req.method && r.rx.test(path));
    if (!route) return send(res, 404, ui.layout({ title: "Não encontrado", body: `<p>Rota ${path} não existe.</p>` }));

    const params = {};
    const match = route.rx.exec(path);
    route.keys.forEach((k, i) => { params[k] = match[i + 1]; });

    const form = req.method === "POST" ? await readBody(req) : new URLSearchParams();
    await route.fn(req, res, params, url.searchParams, form);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    console.error(`[erro] ${req.method} ${req.url}:`, message);
    const back = req.headers.referer || "/";
    redirect(res, back.split("?")[0], message, "erro");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Aurora rodando em http://127.0.0.1:${PORT}`);
});
