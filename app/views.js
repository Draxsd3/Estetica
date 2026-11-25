// Camada de apresentação — HTML renderizado no servidor.
import { money, brDate } from "./db.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const initials = (name) =>
  name.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const pct = (v) => `${Math.round(v * 100)}%`;

const BADGES = {
  rascunho: ["gray", "Rascunho"],
  enviado: ["blue", "Enviado"],
  aprovado: ["green", "Aprovado"],
  recusado: ["red", "Recusado"],
  convertido: ["green", "Convertido"],
  aberto: ["gray", "Aberto"],
  parcial: ["amber", "Parcial"],
  pago: ["green", "Pago"],
  agendado: ["gray", "Agendado"],
  confirmado: ["blue", "Confirmado"],
  em_atendimento: ["amber", "Em atendimento"],
  atendido: ["green", "Atendido"],
  faltou: ["red", "Faltou"],
  cancelado: ["gray", "Cancelado"],
  liberado: ["amber", "A liberar"],
  ok: ["green", "Ok"],
  baixo: ["amber", "Baixo"],
  zerado: ["red", "Zerado"],
  aberto_enc: ["amber", "Em aberto"],
  fechado: ["green", "Fechado"],
};

const badge = (status, label) => {
  const [tone, text] = BADGES[status] || ["gray", status];
  return `<span class="badge badge-${tone}" data-status="${esc(status)}">${esc(label || text)}</span>`;
};

const dueBadge = (r) => {
  if (r.status === "pago") return badge("pago");
  if (r.due_date < new Date().toISOString().slice(0, 10)) return badge("recusado", "Vencido");
  if (r.paid_cents > 0) return badge("parcial");
  return badge("aberto");
};

const progress = (done, total) => {
  const value = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return `<div class="progress" title="${done} de ${total}"><span style="width:${value}%"></span></div>`;
};

const flash = (msg, err) =>
  msg || err
    ? `<div class="banner ${err ? "banner-err" : "banner-ok"}">${esc(err || msg)}</div>`
    : "";

const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M18 20a6.3 6.3 0 0 0-2.2-4.7"/></svg>`,
  quote: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1.2 13H4.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
  wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M16.5 14.5h2"/></svg>`,
  percent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></svg>`,
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const fmtQty = (v) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const firstName = (value) =>
  String(value || "").replace(/^(Dra?\.|Dr\.)\s*/i, "").split(" ")[0];

const NAV = [
  ["op", "Operação", [["/", "Painel", "home"], ["/agenda", "Agenda", "calendar"], ["/pacientes", "Pacientes", "users"]]],
  ["com", "Comercial", [["/orcamentos", "Orçamentos", "quote"], ["/vendas", "Vendas", "bag"]]],
  ["fin", "Financeiro", [["/financeiro", "Financeiro", "wallet"], ["/comissoes", "Comissões", "percent"]]],
  ["ges", "Gestão", [["/servicos", "Serviços e preços", "tag"], ["/estoque", "Estoque", "box"]]],
];

export function layout({ title, subtitle, actions = "", body, active = "", ok = "", erro = "", wide = false }) {
  const nav = NAV.map(
    ([, group, items]) => `
      <div class="nav-group">
        <div class="nav-label">${group}</div>
        ${items
          .map(
            ([href, label, icon]) =>
              `<a href="${href}" class="nav-item ${active === href ? "active" : ""}"><span class="nav-icon">${ICONS[icon] || ""}</span>${label}</a>`
          )
          .join("")}
      </div>`
  ).join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Aurora</title>
<link rel="stylesheet" href="/app.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231F4E43'/><path d='M9 22V10l7 8 7-8v12' stroke='%23F3EEE6' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
</head>
<body>
<aside class="sidebar">
  <div class="brand"><span class="brand-mark">A</span><div><strong>Aurora</strong><small>gestão de clínica</small></div></div>
  <nav>${nav}</nav>
  <div class="user-card">
    <div class="avatar">MA</div>
    <div><strong>Dra. Marina</strong><small>Gestora</small></div>
  </div>
</aside>
<main class="main">
  <header class="topbar">
    <div class="titles"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
    <div class="actions">${actions}</div>
  </header>
  <div class="content ${wide ? "wide" : ""}">
    ${flash(ok, erro)}
    ${body}
  </div>
</main>
<script src="/app.js"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------- painel

export function dashboard(d) {
  const maxSeries = Math.max(1, ...d.series.map((s) => s.v));
  const today = new Date().toISOString().slice(0, 10);
  const appts = d.appointmentsToday
    .map((a) => {
      const overdue = ["agendado", "confirmado"].includes(a.status) && a.starts_at < `${today}T${new Date().toTimeString().slice(0, 5)}`;
      return `<a class="appt-row" href="/agenda">
        <span class="appt-time">${a.starts_at.slice(11, 16)}</span>
        <span class="dot" style="background:${esc(a.color)}"></span>
        <span class="appt-main"><strong>${esc(a.patient)}</strong><small>${esc(a.service || "Avaliação")} · ${esc(a.professional)}</small></span>
        ${badge(a.status, overdue ? "Atrasado" : null)}
      </a>`;
    })
    .join("");

  const funnelMap = Object.fromEntries(d.funnel.map((f) => [f.status, f]));
  const funnelRow = (key, label, color) => {
    const row = funnelMap[key] || { n: 0, v: 0 };
    const max = Math.max(1, ...d.funnel.map((f) => f.v));
    return `<div class="funnel-row">
      <div class="funnel-label">${label}</div>
      <div class="funnel-bar"><span style="width:${Math.round((row.v / max) * 100)}%;background:${color}"></span></div>
      <div class="funnel-val"><strong>${row.n}</strong><small>${money(row.v)}</small></div>
    </div>`;
  };

  const alerts = [
    ...d.overdue.n
      ? [`<a class="alert" href="/financeiro?filter=vencidos"><span class="alert-ico alert-red">!</span><div><strong>${plural(d.overdue.n, "título vencido", "títulos vencidos")}</strong><small>${money(d.overdue.v)} em atraso</small></div></a>`]
      : [],
    ...d.expiring.length
      ? [`<a class="alert" href="/estoque"><span class="alert-ico alert-amber">◷</span><div><strong>${plural(d.expiring.length, "lote vencendo", "lotes vencendo")}</strong><small>${esc(d.expiring[0].product)} · ${brDate(d.expiring[0].expires_on)}</small></div></a>`]
      : [],
    ...d.lowStock.length
      ? [`<a class="alert" href="/estoque"><span class="alert-ico alert-amber">▤</span><div><strong>${plural(d.lowStock.length, "insumo no mínimo", "insumos no mínimo")}</strong><small>${d.lowStock.map((p) => esc(p.name)).slice(0, 2).join(", ")}</small></div></a>`]
      : [],
    `<a class="alert" href="/comissoes"><span class="alert-ico alert-green">◎</span><div><strong>${money(d.commissionsPending)} em comissões</strong><small>liberadas a pagar</small></div></a>`,
  ].join("");

  const delta = d.revenuePrev ? (d.revenueMonth - d.revenuePrev) / d.revenuePrev : null;

  const body = `
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Receita reconhecida · mês</div>
        <div class="kpi-value">${money(d.revenueMonth)}</div>
        <div class="kpi-foot ${delta === null ? "" : delta >= 0 ? "up" : "down"}">${
          delta === null
            ? "primeiro mês com receita reconhecida"
            : `${delta >= 0 ? "▲" : "▼"} ${pct(Math.abs(delta))} vs. mês anterior`
        }</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">A receber</div>
        <div class="kpi-value">${money(d.openCents)}</div>
        <div class="kpi-foot">${plural(d.overdue.n, "vencido", "vencidos")} · ${money(d.overdue.v)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Orçamentos em aberto</div>
        <div class="kpi-value">${d.quotesOpen.n}</div>
        <div class="kpi-foot">${money(d.quotesOpen.v)} em negociação</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Receita a reconhecer</div>
        <div class="kpi-value">${money(d.deferred)}</div>
        <div class="kpi-foot">sessões vendidas e não executadas</div>
      </div>
    </div>

    <div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>Hoje na agenda</h2><a class="link" href="/agenda">Abrir agenda →</a></div>
        <div class="card-body list-tight">
          ${appts || `<p class="empty">Nenhum atendimento hoje. Bom momento para trabalhar o funil.</p>`}
        </div>
      </section>

      <div class="stack">
        <section class="card">
          <div class="card-head"><h2>Funil de orçamentos</h2><a class="link" href="/orcamentos">Ver todos →</a></div>
          <div class="card-body">
            ${funnelRow("rascunho", "Rascunho", "#C9CFCB")}
            ${funnelRow("enviado", "Enviado", "#3E6B8A")}
            ${funnelRow("convertido", "Convertido", "#2F7D5D")}
            ${funnelRow("recusado", "Recusado", "#B4483C")}
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h2>Alertas</h2></div>
          <div class="card-body list-tight">${alerts}</div>
        </section>
      </div>
    </div>

    <div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>Receita reconhecida</h2><span class="hint">últimos meses</span></div>
        <div class="card-body">
          <div class="chart">
            ${d.series
              .map(
                (s) => `<div class="chart-col">
                  <div class="chart-val">${(s.v / 1000).toFixed(1)}k</div>
                  <div class="chart-bar" style="height:${Math.max(6, Math.round((s.v / maxSeries) * 100))}%"></div>
                  <div class="chart-label">${s.period.slice(5)}/${s.period.slice(2, 4)}</div>
                </div>`
              )
              .join("")}
          </div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Últimos recebimentos</h2><a class="link" href="/financeiro">Financeiro →</a></div>
        <div class="card-body list-tight">
          ${d.recentPayments
            .map(
              (p) => `<div class="pay-row">
                <div class="avatar sm">${initials(p.patient)}</div>
                <div class="pay-main"><strong>${esc(p.patient)}</strong><small>${esc(p.method)} · ${brDate(p.paid_at)}</small></div>
                <div class="pay-val">${money(p.amount_cents)}</div>
              </div>`
            )
            .join("")}
        </div>
      </section>
    </div>`;

  return layout({
    title: "Painel",
    subtitle: "A clínica em uma tela: agenda, caixa e funil.",
    active: "/",
    body,
    actions: `<a class="btn btn-ghost" href="/pacientes/novo">+ Paciente</a><a class="btn btn-primary" href="/orcamentos/novo">+ Orçamento</a>`,
  });
}

// ---------------------------------------------------------------- pacientes

export function patientsPage({ rows, q }) {
  const body = `
    <section class="card">
      <div class="card-head">
        <form class="search" method="get" action="/pacientes">
          <input name="q" value="${esc(q)}" placeholder="Buscar por nome, telefone ou CPF">
          <button class="btn btn-ghost">Buscar</button>
        </form>
        <span class="hint">${plural(rows.length, "paciente", "pacientes")}</span>
      </div>
      <div class="card-body no-pad">
        <table class="table">
          <thead><tr><th>Paciente</th><th>Contato</th><th>Último atendimento</th><th class="num">Saldo aberto</th><th></th></tr></thead>
          <tbody>
            ${rows
              .map(
                (p) => `<tr>
                  <td><div class="cell-main"><span class="avatar sm">${initials(p.name)}</span><div><a href="/pacientes/${p.id}"><strong>${esc(p.name)}</strong></a><small>${esc(p.cpf || "sem CPF")}</small></div></div></td>
                  <td>${esc(p.phone || "—")}</td>
                  <td>${p.last_visit ? brDate(p.last_visit) : `<span class="muted">—</span>`}</td>
                  <td class="num ${p.open_cents > 0 ? "neg" : ""}">${money(p.open_cents)}</td>
                  <td class="right"><a class="link" href="/pacientes/${p.id}">Abrir →</a></td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
        ${rows.length === 0 ? `<p class="empty">Nenhum paciente encontrado.</p>` : ""}
      </div>
    </section>`;
  return layout({
    title: "Pacientes",
    subtitle: "Histórico, orçamentos e saldo de cada paciente.",
    active: "/pacientes",
    body,
    actions: `<a class="btn btn-primary" href="/pacientes/novo">+ Novo paciente</a>`,
  });
}

export function patientFormPage() {
  const body = `
    <section class="card narrow">
      <div class="card-head"><h2>Cadastrar paciente</h2></div>
      <form class="card-body form" method="post" action="/pacientes">
        <div class="field"><label>Nome completo</label><input name="name" required autofocus></div>
        <div class="form-row">
          <div class="field"><label>Telefone</label><input name="phone" placeholder="(11) 90000-0000"></div>
          <div class="field"><label>CPF</label><input name="cpf" placeholder="000.000.000-00"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>E-mail</label><input name="email" type="email"></div>
          <div class="field"><label>Nascimento</label><input name="birth" type="date"></div>
        </div>
        <div class="field"><label>Observações clínicas</label><textarea name="notes" rows="3" placeholder="Alergias, contraindicações, preferências"></textarea></div>
        <div class="form-actions"><a class="btn btn-ghost" href="/pacientes">Cancelar</a><button class="btn btn-primary">Salvar paciente</button></div>
      </form>
    </section>`;
  return layout({ title: "Novo paciente", subtitle: "Dados básicos e alertas clínicos.", active: "/pacientes", body });
}

export function patientDetailPage(d) {
  const { patient, quotes, sales, receivables, appointments, encounters, lifetime, sessions } = d;
  const open = receivables.reduce((a, r) => a + (r.amount_cents - r.paid_cents), 0);
  const activeSessions = sessions.filter((s) => s.sessions_done < s.qty_sessions);

  const timeline = [
    ...quotes.map((q) => ({ at: q.created_at, kind: "Orçamento", text: `#${q.number} · ${money(q.total_cents)}`, status: q.status, href: `/orcamentos/${q.id}` })),
    ...sales.map((s) => ({ at: s.created_at, kind: "Venda", text: `${money(s.total_cents)} · ${plural(s.items, "item", "itens")}`, status: "convertido", href: `/vendas/${s.id}` })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8)
    .map(
      (t) => `<a class="timeline-row" href="${t.href}">
        <span class="timeline-dot"></span>
        <div><strong>${t.kind} ${t.text}</strong><small>${brDate(t.at)}</small></div>
        ${badge(t.status)}
      </a>`
    )
    .join("");

  const body = `
    <section class="profile">
      <div class="profile-main">
        <div class="avatar lg">${initials(patient.name)}</div>
        <div>
          <h2>${esc(patient.name)}</h2>
          <p>${esc(patient.phone || "sem telefone")} · ${esc(patient.email || "sem e-mail")} · ${esc(patient.cpf || "sem CPF")}</p>
          ${patient.notes ? `<p class="note">Observação: ${esc(patient.notes)}</p>` : ""}
        </div>
      </div>
      <div class="profile-stats">
        <div><small>Total pago</small><strong>${money(lifetime)}</strong></div>
        <div><small>Saldo aberto</small><strong class="${open ? "neg" : ""}">${money(open)}</strong></div>
        <div><small>Sessões a fazer</small><strong>${activeSessions.reduce((a, s) => a + (s.qty_sessions - s.sessions_done), 0)}</strong></div>
      </div>
    </section>

    <div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>Histórico comercial</h2><a class="link" href="/orcamentos/novo">Novo orçamento →</a></div>
        <div class="card-body list-tight">${timeline || `<p class="empty">Sem histórico ainda.</p>`}</div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Tratamentos em andamento</h2></div>
        <div class="card-body list-tight">
          ${
            activeSessions
              .map(
                (s) => `<div class="session-row">
                  <div><strong>${esc(s.service)}</strong><small>${s.sessions_done} de ${s.qty_sessions} ${s.qty_sessions === 1 ? "sessão" : "sessões"} · ${money(s.total_cents)}</small></div>
                  ${progress(s.sessions_done, s.qty_sessions)}
                </div>`
              )
              .join("") || `<p class="empty">Nenhum pacote em andamento.</p>`
          }
        </div>
      </section>
    </div>

    <div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>Títulos</h2><span class="hint">${money(open)} em aberto</span></div>
        <div class="card-body no-pad">
          <table class="table compact">
            <thead><tr><th>Vencimento</th><th class="num">Valor</th><th class="num">Pago</th><th>Situação</th></tr></thead>
            <tbody>${receivables
              .map(
                (r) => `<tr><td>${brDate(r.due_date)}</td><td class="num">${money(r.amount_cents)}</td><td class="num">${money(r.paid_cents)}</td><td>${dueBadge(r)}</td></tr>`
              )
              .join("") || `<tr><td colspan="4" class="empty">Sem títulos.</td></tr>`}</tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Agenda e atendimentos</h2></div>
        <div class="card-body no-pad">
          <table class="table compact">
            <thead><tr><th>Quando</th><th>Serviço</th><th>Profissional</th><th>Situação</th></tr></thead>
            <tbody>${appointments
              .slice(0, 8)
              .map(
                (a) => `<tr><td>${brDate(a.starts_at)} ${a.starts_at.slice(11, 16)}</td><td>${esc(a.service || "Avaliação")}</td><td>${esc(a.professional)}</td><td>${badge(a.status)}</td></tr>`
              )
              .join("") || `<tr><td colspan="4" class="empty">Sem agendamentos.</td></tr>`}</tbody>
          </table>
        </div>
      </section>
    </div>`;

  return layout({
    title: patient.name,
    subtitle: "Ficha do paciente",
    active: "/pacientes",
    body,
    actions: `<a class="btn btn-ghost" href="/agenda?novo=1&paciente=${patient.id}">Agendar</a><a class="btn btn-primary" href="/orcamentos/novo?paciente=${patient.id}">+ Orçamento</a>`,
  });
}

// ---------------------------------------------------------------- serviços

export function servicesPage({ rows }) {
  const body = `
    <section class="card">
      <div class="card-head"><h2>Tabela de preços e custo real</h2><span class="hint">custo = insumos + sala + profissional</span></div>
      <div class="card-body no-pad">
        <table class="table">
          <thead><tr><th>Serviço</th><th>Duração</th><th class="num">Insumos</th><th class="num">Custo total</th><th class="num">Preço</th><th class="num">Margem</th><th>Ficha técnica</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (s) => `<tr>
                  <td><strong>${esc(s.name)}</strong><small class="block">${esc(s.category)}</small></td>
                  <td>${s.minutes} min</td>
                  <td class="num">${money(s.cost.materials)}</td>
                  <td class="num">${money(s.cost.total)}</td>
                  <td class="num">
                    <form class="inline-form" method="post" action="/servicos/${s.id}/preco">
                      <input name="price" value="${(s.price_cents / 100).toFixed(2).replace(".", ",")}" class="input-money">
                      <button class="btn btn-sm btn-ghost" title="Salvar preço">✓</button>
                    </form>
                  </td>
                  <td class="num"><span class="margin ${s.margin < 0.35 ? "margin-low" : s.margin < 0.5 ? "margin-mid" : "margin-good"}">${pct(s.margin)}</span></td>
                  <td><small class="muted">${s.mats.map((m) => `${m.name} ${fmtQty(m.qty)} ${m.unit}`).join(" · ")}</small></td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    <p class="footnote">Margem = (preço − custo) ÷ preço, antes de comissão e impostos. Abaixo de 35% o serviço paga a estrutura, não o lucro.</p>`;
  return layout({
    title: "Serviços e preços",
    subtitle: "O preço nasce do custo — e o sistema mostra quando ele não cobre.",
    active: "/servicos",
    body,
  });
}

// ---------------------------------------------------------------- orçamentos

export function quotesPage({ rows, status, tabs }) {
  const body = `
    <section class="card">
      <div class="card-head">
        <div class="tabs">
          ${tabs
            .map(([key, label, count]) => `<a class="tab ${status === key ? "active" : ""}" href="/orcamentos?status=${key}">${label}<span>${count}</span></a>`)
            .join("")}
        </div>
      </div>
      <div class="card-body no-pad">
        <table class="table">
          <thead><tr><th>Nº</th><th>Paciente</th><th>Profissional</th><th class="num">Total</th><th>Validade</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            ${rows
              .map(
                (q) => `<tr>
                  <td><a href="/orcamentos/${q.id}"><strong>#${q.number}</strong></a></td>
                  <td>${esc(q.patient)}</td>
                  <td>${esc(q.professional || "—")}</td>
                  <td class="num">${money(q.total_cents)}</td>
                  <td>${brDate(q.valid_until)}</td>
                  <td>${badge(q.status)}</td>
                  <td class="right"><a class="link" href="/orcamentos/${q.id}">Abrir →</a></td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
        ${rows.length === 0 ? `<p class="empty">Nenhum orçamento neste filtro.</p>` : ""}
      </div>
    </section>`;
  return layout({
    title: "Orçamentos",
    subtitle: "O documento onde a margem se decide.",
    active: "/orcamentos",
    body,
    actions: `<a class="btn btn-primary" href="/orcamentos/novo">+ Novo orçamento</a>`,
  });
}

export function quoteFormPage({ patients, professionals, services, patientId }) {
  const svcJson = JSON.stringify(services.map((s) => ({ id: s.id, name: s.name, price: s.price_cents, minutes: s.minutes })));
  const body = `
    <form method="post" action="/orcamentos" id="quote-form">
      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>Paciente e responsável</h2></div>
          <div class="card-body form">
            <div class="field"><label>Paciente</label>
              <select name="patient_id" required>
                <option value="">Selecione…</option>
                ${patients.map((p) => `<option value="${p.id}" ${String(p.id) === String(patientId) ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>Profissional</label>
              <select name="professional_id">
                <option value="">A definir</option>
                ${professionals.map((p) => `<option value="${p.id}">${esc(p.name)} · ${esc(p.role)}</option>`).join("")}
              </select>
            </div>
            <div class="form-row">
              <div class="field"><label>Validade (dias)</label><input name="valid_days" type="number" value="15" min="1" max="90"></div>
              <div class="field"><label>Desconto (R$)</label><input name="discount" id="discount" type="text" inputmode="decimal" value="0,00"></div>
            </div>
            <div class="field"><label>Observações</label><textarea name="notes" rows="3" placeholder="Condições, indicação técnica, combinados"></textarea></div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h2>Itens</h2><span class="hint">desconto máximo 20%</span></div>
          <div class="card-body">
            <div id="items" class="items">
              <div class="item-row">
                <select name="service_id" required>
                  <option value="">Serviço…</option>
                  ${services.map((s) => `<option value="${s.id}">${esc(s.name)} — ${money(s.price_cents)}</option>`).join("")}
                </select>
                <input name="qty" type="number" value="1" min="1" max="30" class="qty" title="Sessões">
                <span class="row-total">R$ 0,00</span>
                <button type="button" class="btn btn-sm btn-ghost remove" title="Remover">×</button>
              </div>
            </div>
            <button type="button" class="btn btn-ghost" id="add-item">+ Adicionar serviço</button>
          </div>
        </section>
      </div>

      <div class="checkout">
        <div class="totals">
          <div><span>Subtotal</span><strong id="subtotal">R$ 0,00</strong></div>
          <div><span>Desconto</span><strong id="discount-view" class="neg">− R$ 0,00</strong></div>
          <div class="grand"><span>Total</span><strong id="total">R$ 0,00</strong></div>
        </div>
        <div class="form-actions">
          <a class="btn btn-ghost" href="/orcamentos">Cancelar</a>
          <button class="btn btn-primary">Gerar orçamento</button>
        </div>
      </div>
    </form>
    <script>window.__SERVICES__ = ${svcJson};</script>`;
  return layout({ title: "Novo orçamento", subtitle: "Monte a proposta e envie para aprovação.", active: "/orcamentos", body });
}

export function quoteDetailPage(q, professionals) {
  const expired = q.status === "enviado" && q.valid_until < new Date().toISOString().slice(0, 10);
  const items = q.items
    .map(
      (i) => `<tr>
        <td><strong>${esc(i.service)}</strong><small class="block">${i.minutes} min por sessão</small></td>
        <td class="num">${i.qty_sessions}</td>
        <td class="num">${money(i.unit_cents)}</td>
        <td class="num">${money(i.total_cents)}</td>
      </tr>`
    )
    .join("");

  let actionPanel = "";
  if (q.sale) {
    actionPanel = `<div class="panel-ok">✓ Orçamento convertido na venda <a href="/vendas/${q.sale.id}">#${q.sale.id}</a>.</div>`;
  } else if (q.status === "recusado") {
    actionPanel = `<div class="panel-muted">Orçamento recusado — motivo: ${esc(q.lost_reason || "não informado")}.</div>`;
  } else if (expired) {
    actionPanel = `<div class="panel-warn">Proposta vencida em ${brDate(q.valid_until)}. Revise o preço antes de fechar.</div>`;
  } else {
    actionPanel = `
      <form method="post" action="/orcamentos/${q.id}/vender" class="close-form" data-total="${q.total_cents}">
        <div class="form-row">
          <div class="field"><label>Entrada (R$)</label><input name="entrada" id="entrada" value="0,00" inputmode="decimal"></div>
          <div class="field"><label>Parcelas</label><input name="installments" id="installments" type="number" min="1" max="24" value="1"></div>
          <div class="field"><label>1º vencimento</label><input name="first_due" type="date" value="${addDaysISO(30)}"></div>
        </div>
        <div class="preview" id="installment-preview"></div>
        <div class="field"><label>Motivo da perda (usado ao recusar)</label><input name="reason" placeholder="Preço, prazo, desistência…"></div>
        <div class="form-actions">
          <button class="btn btn-primary">Fechar venda</button>
          <button class="btn btn-ghost" formaction="/orcamentos/${q.id}/recusar" formnovalidate>Recusar proposta</button>
        </div>
      </form>`;
  }

  const body = `
    <article class="doc">
      <header class="doc-head">
        <div>
          <div class="doc-kicker">Proposta comercial</div>
          <h2>Orçamento #${q.number}</h2>
          <p>${esc(q.patient)} · ${esc(q.professional || "profissional a definir")}</p>
        </div>
        <div class="doc-meta">
          ${badge(q.status)}
          <small>Emitido em ${brDate(q.created_at)}</small>
          <small>Válido até ${brDate(q.valid_until)}</small>
        </div>
      </header>
      <table class="table doc-table">
        <thead><tr><th>Serviço</th><th class="num">Sessões</th><th class="num">Unitário</th><th class="num">Total</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <div class="doc-totals">
        <div><span>Subtotal</span><strong>${money(q.subtotal_cents)}</strong></div>
        ${q.discount_cents ? `<div><span>Desconto</span><strong class="neg">− ${money(q.discount_cents)}</strong></div>` : ""}
        <div class="grand"><span>Total</span><strong>${money(q.total_cents)}</strong></div>
      </div>
      ${q.notes ? `<p class="doc-note">${esc(q.notes)}</p>` : ""}
    </article>

    <section class="card">
      <div class="card-head"><h2>Fechamento</h2><span class="hint">gera títulos e libera as sessões</span></div>
      <div class="card-body">${actionPanel}</div>
    </section>`;

  return layout({
    title: `Orçamento #${q.number}`,
    subtitle: q.patient,
    active: "/orcamentos",
    body,
    actions: `<a class="btn btn-ghost" href="/orcamentos">Voltar</a>`,
  });
}

const addDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------- vendas

export function salesPage({ rows }) {
  const body = `
    <section class="card">
      <div class="card-head"><h2>Vendas</h2><span class="hint">receita reconhecida por execução</span></div>
      <div class="card-body no-pad">
        <table class="table">
          <thead><tr><th>#</th><th>Paciente</th><th>Tipo</th><th class="num">Total</th><th class="num">Reconhecido</th><th>Data</th><th></th></tr></thead>
          <tbody>${rows
            .map(
              (s) => `<tr>
                <td><a href="/vendas/${s.id}"><strong>#${s.id}</strong></a></td>
                <td>${esc(s.patient)}</td>
                <td>${s.kind === "pacote" ? "Pacote" : "Avulso"}</td>
                <td class="num">${money(s.total_cents)}</td>
                <td class="num">${money(s.recognized)}</td>
                <td>${brDate(s.created_at)}</td>
                <td class="right"><a class="link" href="/vendas/${s.id}">Abrir →</a></td>
              </tr>`
            )
            .join("")}</tbody>
        </table>
      </div>
    </section>`;
  return layout({ title: "Vendas", subtitle: "Pacotes, sessões e receita diferida.", active: "/vendas", body });
}

export function saleDetailPage(s) {
  const items = s.items
    .map(
      (i) => `<div class="sale-item">
        <div class="sale-item-head">
          <div><strong>${esc(i.service)}</strong><small>${i.sessions_done} de ${i.qty_sessions} ${i.qty_sessions === 1 ? "sessão executada" : "sessões executadas"}</small></div>
          <div class="sale-item-money">${money(i.total_cents)}</div>
        </div>
        ${progress(i.sessions_done, i.qty_sessions)}
        <div class="sale-item-foot">
          <span>Reconhecido: <strong>${money(i.revenue_recognized_cents)}</strong></span>
          <span>A reconhecer: <strong>${money(i.total_cents - i.revenue_recognized_cents)}</strong></span>
          ${i.sessions_done < i.qty_sessions ? `<a class="link" href="/agenda?novo=1&paciente=${s.patient_id}&item=${i.id}&servico=${i.service_id}">Agendar sessão →</a>` : ""}
        </div>
      </div>`
    )
    .join("");

  const body = `
    <section class="card">
      <div class="card-head"><h2>Sessões</h2><span class="hint">${s.kind === "pacote" ? "pacote" : "avulso"}${s.discount_cents ? ` · desconto de ${money(s.discount_cents)} rateado entre os itens` : ""}</span></div>
      <div class="card-body sale-items">${items}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Cobrança</h2><span class="hint">${money(s.deferred)} a reconhecer</span></div>
      <div class="card-body no-pad">
        <table class="table compact">
          <thead><tr><th>Parcela</th><th>Vencimento</th><th class="num">Valor</th><th>Situação</th><th class="right">Baixa</th></tr></thead>
          <tbody>${s.receivables
            .map(
              (r) => `<tr>
                <td>${r.seq}ª</td>
                <td>${brDate(r.due_date)}</td>
                <td class="num">${money(r.amount_cents)}</td>
                <td>${dueBadge(r)}</td>
                <td class="right">${
                  r.status !== "pago"
                    ? `<form method="post" action="/financeiro/receber/${r.id}" class="inline-form">
                        <input type="hidden" name="amount" value="${(r.amount_cents - r.paid_cents) / 100}">
                        <select name="method" class="select-sm">
                          <option>PIX</option><option>Débito</option><option>Crédito</option><option>Dinheiro</option>
                        </select>
                        <button class="btn btn-sm btn-primary">Receber</button>
                      </form>`
                    : `<span class="muted">quitado</span>`
                }</td>
              </tr>`
            )
            .join("")}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Resumo financeiro</h2></div>
      <div class="card-body summary-row">
        <div><small>Total contratado</small><strong>${money(s.total_cents)}</strong></div>
        <div><small>Receita reconhecida</small><strong class="pos">${money(s.recognized)}</strong></div>
        <div><small>A reconhecer</small><strong>${money(s.deferred)}</strong></div>
        <div><small>Recebido</small><strong>${money(s.receivables.reduce((a, r) => a + r.paid_cents, 0))}</strong></div>
      </div>
    </section>`;
  return layout({
    title: `Venda #${s.id}`,
    subtitle: `${s.patient} · ${brDate(s.created_at)}`,
    active: "/vendas",
    body,
    actions: `<a class="btn btn-ghost" href="/vendas">Voltar</a>`,
  });
}

// ---------------------------------------------------------------- agenda

export function agendaPage({ week, professionals, services, patients, novo, selectedPatient, selectedService, selectedItem }) {
  const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
  const today = new Date().toISOString().slice(0, 10);
  const prev = shiftISO(week.start, -7);
  const next = shiftISO(week.start, 7);

  const daysHtml = week.days
    .map((d) => {
      const date = new Date(d.iso + "T12:00:00");
      const label = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const isToday = d.iso === today;
      return `<div class="day ${isToday ? "today" : ""}">
        <div class="day-head"><span>${label}</span><strong>${d.iso.slice(8)}</strong></div>
        <div class="day-body">
          ${
            d.items
              .map(
                (a) => `<div class="appt-card" style="--c:${esc(a.color)}">
                  <div class="appt-top"><span>${a.starts_at.slice(11, 16)}</span>${a.encounter_id && a.encounter_status === "aberto" ? `<em>em curso</em>` : ""}</div>
                  <strong>${esc(a.patient)}</strong>
                  <small>${esc(a.service || "Avaliação")} · ${esc(firstName(a.professional))}</small>
                  <div class="appt-actions">
                    ${
                      a.encounter_id
                        ? `<a class="btn btn-xs btn-ghost" href="/atendimentos/${a.encounter_id}">Abrir</a>`
                        : a.status === "atendido"
                        ? badge("atendido")
                        : a.status === "faltou"
                        ? badge("faltou")
                        : `<form method="post" action="/agenda/${a.id}/iniciar"><button class="btn btn-xs btn-primary">Atender</button></form>
                           <form method="post" action="/agenda/${a.id}/faltou"><button class="btn btn-xs btn-ghost">Faltou</button></form>`
                    }
                  </div>
                </div>`
              )
              .join("") || `<div class="day-empty">—</div>`
          }
        </div>
      </div>`;
    })
    .join("");

  const novoBlock = novo
    ? `<section class="card">
        <div class="card-head"><h2>Novo agendamento</h2><a class="link" href="/agenda">fechar</a></div>
        <form class="card-body form" method="post" action="/agenda">
          <input type="hidden" name="sale_item_id" value="${selectedItem || ""}">
          ${selectedItem ? `<p class="hint">Sessão de pacote vinculada: ao fechar o atendimento, a receita desta venda é reconhecida.</p>` : ""}
          <div class="form-row">
            <div class="field"><label>Paciente</label><select name="patient_id" required>
              <option value="">Selecione…</option>
              ${patients.map((p) => `<option value="${p.id}" ${String(p.id) === String(selectedPatient) ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select></div>
            <div class="field"><label>Profissional</label><select name="professional_id" required>
              ${professionals.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}
            </select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Serviço</label><select name="service_id">
              <option value="">Avaliação</option>
              ${services.map((s) => `<option value="${s.id}" ${String(s.id) === String(selectedService) ? "selected" : ""}>${esc(s.name)} · ${s.minutes} min</option>`).join("")}
            </select></div>
            <div class="field"><label>Duração (min)</label><input name="duration_min" type="number" value="60" min="15" step="15"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Data</label><input name="date" type="date" value="${today}" required></div>
            <div class="field"><label>Hora</label><input name="time" type="time" value="09:00" required></div>
          </div>
          <div class="form-actions"><button class="btn btn-primary">Agendar</button></div>
        </form>
      </section>`
    : "";

  const body = `
    ${novoBlock}
    <section class="card">
      <div class="card-head">
        <div class="week-nav">
          <a class="btn btn-sm btn-ghost" href="/agenda?start=${prev}">‹</a>
          <strong>${brDate(week.start)} — ${brDate(week.days[6].iso)}</strong>
          <a class="btn btn-sm btn-ghost" href="/agenda?start=${next}">›</a>
          <a class="link" href="/agenda">hoje</a>
        </div>
        <span class="hint">${plural(week.total, "atendimento", "atendimentos")} na semana</span>
      </div>
      <div class="week">${daysHtml}</div>
    </section>`;
  return layout({
    title: "Agenda",
    subtitle: "Ocupação por profissional, dia a dia.",
    active: "/agenda",
    body,
    actions: `<a class="btn btn-primary" href="/agenda?novo=1">+ Agendar</a>`,
    wide: true,
  });
}

const shiftISO = (iso, days) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------- atendimento

export function encounterPage(e) {
  const materials = e.materials
    .map(
      (m) => `<tr>
        <td><strong>${esc(m.name)}</strong><small class="block">${m.lot ? `lote ${esc(m.lot.lot)} · val. ${brDate(m.lot.expires_on)}` : "sem lote disponível"}</small></td>
        <td class="num">${fmtQty(m.qty)} ${esc(m.unit)}</td>
        <td class="num">${money(m.cost)}</td>
        <td class="num"><input name="qty_${m.product_id}" class="qty" type="number" step="0.01" min="0" value="${m.qty}" ${m.lot ? "" : "disabled"}></td>
      </tr>`
    )
    .join("");

  const body = `
    <section class="encounter-head">
      <div class="avatar lg">${initials(e.patient)}</div>
      <div>
        <h2>${esc(e.patient)}</h2>
        <p>${esc(e.service || "Avaliação")} · ${esc(e.professional)} · ${e.starts_at ? brDate(e.starts_at) + " " + e.starts_at.slice(11, 16) : brDate(e.opened_at)}</p>
      </div>
      ${e.status === "fechado" ? badge("fechado") : badge("aberto_enc")}
    </section>

    ${e.status === "fechado" ? `<div class="panel-ok">Atendimento encerrado. Receita e comissão já lançadas.</div>` : ""}

    <form method="post" action="/atendimentos/${e.id}/fechar">
      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>Materiais aplicados</h2><span class="hint">baixa automática por lote</span></div>
          <div class="card-body no-pad">
            <table class="table compact">
              <thead><tr><th>Insumo</th><th class="num">Ficha</th><th class="num">Custo</th><th class="num">Usado</th></tr></thead>
              <tbody>${materials || `<tr><td colspan="4" class="empty">Serviço sem ficha técnica.</td></tr>`}</tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h2>Evolução</h2></div>
          <div class="card-body form">
            <div class="field"><label>Registro do atendimento</label>
              <textarea name="notes" rows="6" placeholder="Técnica, dose, intercorrências, orientações">${esc(e.notes || "")}</textarea>
            </div>
            ${
              e.sale_item_id
                ? `<p class="hint">Sessão vinculada à venda — o fechamento reconhece a receita e provisiona a comissão.</p>`
                : `<p class="hint warn">Sem venda vinculada: a receita não será reconhecida ao fechar.</p>`
            }
            <div class="form-actions">
              ${e.status === "fechado" ? "" : `<button class="btn btn-primary">Fechar atendimento</button>`}
            </div>
          </div>
        </section>
      </div>
    </form>`;
  return layout({
    title: "Atendimento",
    subtitle: e.status === "fechado" ? "Encerrado" : "Em andamento",
    active: "/agenda",
    body,
    actions: `<a class="btn btn-ghost" href="/agenda">Voltar</a>`,
  });
}

// ---------------------------------------------------------------- financeiro

export function financesPage(f) {
  const tab = f.tab;
  const rows = f.receivables
    .map(
      (r) => `<tr>
        <td>${brDate(r.due_date)}</td>
        <td><a href="/pacientes/${r.patient_id}">${esc(r.patient)}</a><small class="block">${r.kind === "pacote" ? "Pacote" : "Avulso"} · parcela ${r.seq}</small></td>
        <td class="num">${money(r.amount_cents)}</td>
        <td class="num">${money(r.paid_cents)}</td>
        <td>${dueBadge(r)}</td>
        <td class="right">${
          r.status !== "pago"
            ? `<form method="post" action="/financeiro/receber/${r.id}" class="inline-form">
                <input type="hidden" name="amount" value="${(r.amount_cents - r.paid_cents) / 100}">
                <select name="method" class="select-sm"><option>PIX</option><option>Débito</option><option>Crédito</option><option>Dinheiro</option></select>
                <button class="btn btn-sm btn-primary">Receber</button>
              </form>`
            : `<span class="muted">quitado</span>`
        }</td>
      </tr>`
    )
    .join("");

  const payables = f.payables
    .map(
      (p) => `<tr>
        <td>${brDate(p.due_date)}</td>
        <td><strong>${esc(p.supplier)}</strong><small class="block">${esc(p.category)}</small></td>
        <td class="num">${money(p.amount_cents)}</td>
        <td>${p.status === "pago" ? badge("pago") : p.due_date < f.today ? badge("recusado", "Vencido") : badge("aberto")}</td>
        <td class="right">${p.status !== "pago" ? `<form method="post" action="/financeiro/pagar/${p.id}"><button class="btn btn-sm btn-ghost">Pagar</button></form>` : `<span class="muted">—</span>`}</td>
      </tr>`
    )
    .join("");

  const caixa = f.byMethod
    .map((m) => `<div class="summary-item"><small>${esc(m.method)}</small><strong>${money(m.v)}</strong><span>${m.n} lançamento(s)</span></div>`)
    .join("");

  const tabs = [
    ["receber", "A receber"],
    ["pagar", "A pagar"],
    ["caixa", "Caixa de hoje"],
  ]
    .map(([k, label]) => `<a class="tab ${tab === k ? "active" : ""}" href="/financeiro?tab=${k}">${label}</a>`)
    .join("");

  let content = "";
  if (tab === "receber") {
    content = `
      <div class="grid-3 kpi-inline">
        <div class="kpi"><div class="kpi-label">Em aberto</div><div class="kpi-value">${money(f.openTotal)}</div></div>
        <div class="kpi"><div class="kpi-label">Vencido</div><div class="kpi-value neg">${money(f.overdueTotal)}</div></div>
        <div class="kpi"><div class="kpi-label">Recebido hoje</div><div class="kpi-value pos">${money(f.paidToday.v)}</div><div class="kpi-foot">${plural(f.paidToday.n, "baixa", "baixas")}</div></div>
      </div>
      <section class="card">
        <div class="card-head">
          <form method="get" action="/financeiro" class="filters">
            <input type="hidden" name="tab" value="receber">
            <select name="filter" onchange="this.form.submit()">
              ${[["todos", "Todos"], ["abertos", "Em aberto"], ["vencidos", "Vencidos"], ["pagos", "Pagos"]]
                .map(([v, l]) => `<option value="${v}" ${f.filter === v ? "selected" : ""}>${l}</option>`)
                .join("")}
            </select>
          </form>
          <span class="hint">${plural(f.receivables.length, "título", "títulos")}</span>
        </div>
        <div class="card-body no-pad">
          <table class="table">
            <thead><tr><th>Vencimento</th><th>Paciente</th><th class="num">Valor</th><th class="num">Pago</th><th>Situação</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  } else if (tab === "pagar") {
    content = `
      <div class="grid-3 kpi-inline">
        <div class="kpi"><div class="kpi-label">A pagar</div><div class="kpi-value">${money(f.toPay)}</div></div>
        <div class="kpi"><div class="kpi-label">Pago hoje</div><div class="kpi-value">${money(f.paidToday.v)}</div></div>
        <div class="kpi"><div class="kpi-label">Fornecedores</div><div class="kpi-value">${f.payables.filter((p) => p.status !== "pago").length}</div></div>
      </div>
      <section class="card">
        <div class="card-head"><h2>Contas a pagar</h2></div>
        <div class="card-body no-pad">
          <table class="table">
            <thead><tr><th>Vencimento</th><th>Fornecedor</th><th class="num">Valor</th><th>Situação</th><th></th></tr></thead>
            <tbody>${payables}</tbody>
          </table>
        </div>
      </section>`;
  } else {
    content = `
      <div class="grid-3 kpi-inline">
        <div class="kpi"><div class="kpi-label">Recebido hoje</div><div class="kpi-value pos">${money(f.paidToday.v)}</div><div class="kpi-foot">${f.paidToday.n} lançamento(s)</div></div>
        <div class="kpi"><div class="kpi-label">Total recebido</div><div class="kpi-value">${money(f.paidToday.v)}</div></div>
        <div class="kpi"><div class="kpi-label">A receber</div><div class="kpi-value">${money(f.openTotal)}</div></div>
      </div>
      <section class="card">
        <div class="card-head"><h2>Caixa de hoje</h2><span class="hint">${brDate(f.today)}</span></div>
        <div class="card-body summary-row">${caixa || `<p class="empty">Nenhum recebimento hoje.</p>`}</div>
      </section>`;
  }

  return layout({
    title: "Financeiro",
    subtitle: "Competência e caixa, cada um no seu lugar.",
    active: "/financeiro",
    body: `<div class="tabs tabs-top">${tabs}</div>${content}`,
  });
}

// ---------------------------------------------------------------- comissões

export function commissionsPage({ period, byProf, rows }) {
  const profs = byProf
    .map(
      (p) => `<section class="card">
        <div class="card-head">
          <div><h2>${esc(p.name)}</h2><span class="hint">${esc(p.role)}</span></div>
          <div class="head-actions">
            <strong>${money(p.total)}</strong>
            ${p.pending > 0 ? `<form method="post" action="/comissoes/pagar"><input type="hidden" name="professional" value="${esc(p.name)}"><input type="hidden" name="period" value="${period}"><button class="btn btn-sm btn-primary">Pagar ${money(p.pending)}</button></form>` : badge("pago", "Pago")}
          </div>
        </div>
        <div class="card-body no-pad">
          <table class="table compact">
            <thead><tr><th>Data</th><th>Serviço</th><th class="num">Base</th><th class="num">Comissão</th><th>Situação</th></tr></thead>
            <tbody>${p.rows
              .map(
                (r) => `<tr><td>${brDate(r.created_at)}</td><td>${esc(r.service || "—")}</td><td class="num">${money(r.base_cents)}</td><td class="num">${money(r.amount_cents)}</td><td>${badge(r.status)}</td></tr>`
              )
              .join("")}</tbody>
          </table>
        </div>
      </section>`
    )
    .join("");

  const body = `
    <section class="card">
      <div class="card-head">
        <form class="filters" method="get" action="/comissoes">
          <label>Competência</label>
          <input type="month" name="period" value="${period}" onchange="this.form.submit()">
        </form>
        <span class="hint">${plural(rows.length, "lançamento", "lançamentos")}</span>
      </div>
    </section>
    ${profs || `<section class="card"><div class="card-body"><p class="empty">Nenhuma comissão nesta competência.</p></div></section>`}`;

  return layout({
    title: "Comissões",
    subtitle: "Provisão por execução, pagamento com recibo.",
    active: "/comissoes",
    body,
  });
}

// ---------------------------------------------------------------- estoque

export function stockPage({ products, lots, moves }) {
  const prodRows = products
    .map(
      (p) => `<tr>
        <td><strong>${esc(p.name)}</strong><small class="block">${p.lot_controlled ? "controla lote" : "sem lote"}</small></td>
        <td class="num">${fmtQty(p.stock)} ${esc(p.unit)}</td>
        <td class="num">${p.min_stock}</td>
        <td class="num">${money(p.cost_cents)}</td>
        <td>${badge(p.status)}</td>
      </tr>`
    )
    .join("");

  const lotRows = lots
    .map(
      (l) => `<tr>
        <td><strong>${esc(l.product)}</strong><small class="block">lote ${esc(l.lot || "—")}</small></td>
        <td>${brDate(l.expires_on)}</td>
        <td class="num">${fmtQty(l.qty)}</td>
        <td>${l.expired ? badge("recusado", "Vencido") : l.expiring ? badge("parcial", "Vence em breve") : badge("ok")}</td>
      </tr>`
    )
    .join("");

  const moveRows = moves
    .slice(0, 12)
    .map(
      (m) => `<tr><td>${brDate(m.created_at)}</td><td>${esc(m.product)}</td><td>${m.kind === "entrada" ? "Entrada" : "Saída"}</td><td class="num">${fmtQty(m.qty)}</td><td>${esc(m.reason || "")}</td></tr>`
    )
    .join("");

  const body = `
    <div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>Posição de estoque</h2></div>
        <div class="card-body no-pad">
          <table class="table compact">
            <thead><tr><th>Insumo</th><th class="num">Saldo</th><th class="num">Mín.</th><th class="num">Custo</th><th>Situação</th></tr></thead>
            <tbody>${prodRows}</tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Entrada de insumo</h2></div>
        <form class="card-body form" method="post" action="/estoque">
          <div class="field"><label>Produto</label><select name="product_id" required>
            ${products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}
          </select></div>
          <div class="form-row">
            <div class="field"><label>Lote</label><input name="lot" placeholder="TX-2411"></div>
            <div class="field"><label>Validade</label><input name="expires_on" type="date"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Quantidade</label><input name="qty" type="number" step="0.01" min="0.01" required></div>
            <div class="field"><label>Custo unitário (R$)</label><input name="cost" inputmode="decimal" placeholder="opcional"></div>
          </div>
          <div class="form-actions"><button class="btn btn-primary">Registrar entrada</button></div>
        </form>
      </section>
    </div>

    <section class="card">
      <div class="card-head"><h2>Lotes e validade</h2><span class="hint">FEFO: o que vence primeiro sai primeiro</span></div>
      <div class="card-body no-pad">
        <table class="table">
          <thead><tr><th>Produto</th><th>Validade</th><th class="num">Saldo</th><th>Situação</th></tr></thead>
          <tbody>${lotRows}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Últimas movimentações</h2></div>
      <div class="card-body no-pad">
        <table class="table compact">
          <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th class="num">Qtd.</th><th>Motivo</th></tr></thead>
          <tbody>${moveRows || `<tr><td colspan="5" class="empty">Sem movimentações.</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
  return layout({
    title: "Estoque",
    subtitle: "Lote, validade e custo real por procedimento.",
    active: "/estoque",
    body,
  });
}
