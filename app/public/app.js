// Interações leves: construtor de orçamento e prévia de parcelas.
(function () {
  const fmt = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function parseMoney(value) {
    if (value == null) return 0;
    let s = String(value).trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
    if (!s) return 0;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const n = Number(s);
    return Math.round((Number.isFinite(n) ? n : 0) * 100);
  }

  // ---------------------------------------------------------- orçamento
  const items = document.getElementById("items");
  if (items) {
    const services = window.__SERVICES__ || [];
    const subtotalEl = document.getElementById("subtotal");
    const discountEl = document.getElementById("discount");
    const discountView = document.getElementById("discount-view");
    const totalEl = document.getElementById("total");

    const recalc = () => {
      let subtotal = 0;
      items.querySelectorAll(".item-row").forEach((row) => {
        const select = row.querySelector("select");
        const qty = Number(row.querySelector(".qty").value) || 1;
        const svc = services.find((s) => String(s.id) === select.value);
        const total = svc ? svc.price * qty : 0;
        row.querySelector(".row-total").textContent = fmt(total);
        subtotal += total;
      });
      let discount = parseMoney(discountEl.value);
      const max = Math.round(subtotal * 0.2);
      if (discount > max) {
        discount = max;
        discountEl.value = (max / 100).toFixed(2).replace(".", ",");
      }
      subtotalEl.textContent = fmt(subtotal);
      discountView.textContent = "− " + fmt(discount);
      totalEl.textContent = fmt(subtotal - discount);
    };

    const rowTemplate = items.querySelector(".item-row").cloneNode(true);

    document.getElementById("add-item").addEventListener("click", () => {
      const row = rowTemplate.cloneNode(true);
      row.querySelector("select").value = "";
      row.querySelector(".qty").value = 1;
      row.querySelector(".row-total").textContent = fmt(0);
      items.appendChild(row);
      recalc();
    });

    items.addEventListener("input", recalc);
    items.addEventListener("change", recalc);
    discountEl.addEventListener("input", recalc);
    items.addEventListener("click", (e) => {
      const btn = e.target.closest(".remove");
      if (!btn) return;
      const rows = items.querySelectorAll(".item-row");
      if (rows.length > 1) {
        btn.closest(".item-row").remove();
        recalc();
      }
    });

    recalc();
  }

  // ---------------------------------------------------------- parcelas
  const closeForm = document.querySelector(".close-form");
  if (closeForm) {
    const total = Number(closeForm.dataset.total || 0);
    const entradaEl = document.getElementById("entrada");
    const instEl = document.getElementById("installments");
    const preview = document.getElementById("installment-preview");

    const update = () => {
      const entrada = Math.min(parseMoney(entradaEl.value), total);
      const remaining = total - entrada;
      const n = Math.max(1, Number(instEl.value) || 1);
      if (remaining <= 0) {
        preview.textContent = "Venda quitada com a entrada.";
        return;
      }
      const per = Math.floor(remaining / n);
      const last = remaining - per * (n - 1);
      preview.innerHTML =
        `${n}× de <strong>${fmt(per)}</strong>` +
        (last !== per ? ` · última de <strong>${fmt(last)}</strong>` : "") +
        (entrada > 0 ? ` · entrada de <strong>${fmt(entrada)}</strong>` : "");
    };

    entradaEl.addEventListener("input", update);
    instEl.addEventListener("input", update);
    update();
  }

  // ---------------------------------------------------------- confirmações
  document.querySelectorAll("form[data-confirm]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      if (!window.confirm(form.dataset.confirm)) e.preventDefault();
    });
  });
})();
