"use strict";

// 01. Estado: os filtros ficam no navegador; os registros continuam no PostgreSQL.
const $ = (selector) => document.querySelector(selector);
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const state = {
  transactions: [],
  loaded: false,
  period: "all",
  type: "all",
  search: "",
  sort: "recent",
  page: 0,
  pageSize: 6,
  editingId: null,
  deletingId: null,
  saving: false,
  deleting: false,
  hidden: false,
  request: 0,
  controller: null,
  chart: [],
};
let toastTimer;
let toastVersion = 0;
let previousFocus;

function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* O painel também funciona com armazenamento bloqueado. */
  }
}
function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}
function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dayNumber(iso) {
  return Math.floor(Date.parse(`${iso}T12:00:00Z`) / 86400000);
}
function dayDate(day) {
  return new Date(day * 86400000);
}
function plural(count, singular, multiple) {
  return `${count} ${count === 1 ? singular : multiple}`;
}
function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// 02. Dinheiro: BigInt guarda centavos inteiros, inclusive para valores grandes.
function decimalToCents(value) {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new Error("Valor monetário inválido na resposta.");
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function centsToDecimal(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function formatMoney(cents) {
  if (state.hidden) return "••••";
  const absolute = cents < 0n ? -cents : cents;
  const fraction = String(absolute % 100n).padStart(2, "0");
  const formatted = moneyFormatter
    .formatToParts(absolute / 100n)
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
  return `${cents < 0n ? "−" : ""}${formatted}`;
}

function inputToCents(value) {
  let normalized = value.trim();
  if (/^(?:\d{1,3}(?:\.\d{3})+|\d+),\d{1,2}$/.test(normalized))
    normalized = normalized.replaceAll(".", "").replace(",", ".");
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized))
    normalized = normalized.replaceAll(".", "");
  else if (!/^\d+(?:\.\d{1,2})?$/.test(normalized))
    throw new Error("Informe um valor válido, como 1.250,50.");
  const cents = decimalToCents(normalized);
  if (cents <= 0n) throw new Error("O valor precisa ser maior que zero.");
  if (cents >= 10000000000000000000n)
    throw new Error("Use até 17 dígitos inteiros e duas casas decimais.");
  return cents;
}

// O terceiro argumento do reviver preserva a escrita original dos números JSON.
// Navegadores antigos usam um caminho limitado a valores que podem ler com segurança.
function parseApiJSON(text) {
  return JSON.parse(text, (key, value, context) => {
    if ((key === "amount" || key === "id") && typeof value === "number") {
      if (context?.source) return context.source;
      if (
        (key === "amount" && Math.abs(value) > 1e12) ||
        (key === "id" && !Number.isSafeInteger(value))
      )
        throw new Error(
          "Atualize seu navegador para consultar estes valores com precisão.",
        );
      return key === "amount" ? value.toFixed(2) : String(value);
    }
    return value;
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let detail;
    try {
      const body = await response.json();
      detail =
        body.errors?.map((entry) => entry.message).join(" ") || body.detail;
    } catch {
      /* Respostas de erro também podem não conter JSON. */
    }
    throw new Error(
      detail ||
        (response.status === 404
          ? "Esse lançamento não foi encontrado. Atualize o histórico."
          : "Não foi possível concluir a operação agora."),
    );
  }
  return response.status === 204 ? null : parseApiJSON(await response.text());
}

async function refresh() {
  const request = ++state.request;
  state.controller?.abort();
  state.controller = new AbortController();
  $("#sync-state").className = "sync-state loading";
  $("#sync-label").textContent = "Atualizando seu espaço…";
  $("#refresh-button").classList.add("is-spinning");
  $("#refresh-button").disabled = true;
  try {
    const data = await api("/api/transactions", {
      signal: state.controller.signal,
    });
    if (request !== state.request) return;
    if (!Array.isArray(data))
      throw new Error("Não foi possível ler o histórico recebido.");
    state.transactions = data.map((item) => {
      if (
        !/^\d+$/.test(String(item.id)) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        !Number.isFinite(dayNumber(item.date)) ||
        !["RECEITA", "DESPESA"].includes(item.type) ||
        typeof item.description !== "string"
      )
        throw new Error("Não foi possível ler um lançamento recebido.");
      return {
        id: String(item.id),
        description: item.description,
        date: item.date,
        type: item.type,
        cents: decimalToCents(item.amount),
      };
    });
    state.loaded = true;
    $("#load-error").hidden = true;
    $("#transactions-loading").hidden = true;
    $("#sync-state").className = "sync-state";
    $("#sync-label").textContent = "Atualizado agora";
    $("#sync-state").title =
      `Última atualização: ${new Date().toLocaleTimeString("pt-BR")}`;
    render();
  } catch (error) {
    if (error.name === "AbortError" || request !== state.request) return;
    $("#sync-state").className = "sync-state error";
    $("#sync-label").textContent = "Falha ao atualizar";
    $("#load-error-text").textContent =
      `${error.message || "Não foi possível atualizar o painel."}${state.loaded ? " Os últimos dados carregados continuam visíveis." : " Tente novamente em instantes."}`;
    $("#load-error").hidden = false;
    $("#transactions-loading").hidden = true;
  } finally {
    if (request === state.request) {
      $("#refresh-button").disabled = false;
      $("#refresh-button").classList.remove("is-spinning");
    }
  }
}

// 03. Um mesmo conjunto de registros alimenta indicadores, gráfico e histórico.
function periodRows() {
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  if (state.period === "month")
    return state.transactions.filter((item) =>
      item.date.startsWith(today.slice(0, 7)),
    );
  if (state.period === "previous") {
    const previous = new Date(year, month - 2, 15);
    const prefix = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
    return state.transactions.filter((item) => item.date.startsWith(prefix));
  }
  if (state.period === "last90") {
    const end = dayNumber(today);
    return state.transactions.filter(
      (item) => dayNumber(item.date) >= end - 89 && dayNumber(item.date) <= end,
    );
  }
  return state.transactions;
}

function totals(rows) {
  return rows.reduce(
    (result, item) => {
      if (item.type === "RECEITA") {
        result.income += item.cents;
        result.incomeCount++;
      } else {
        result.expenses += item.cents;
        result.expensesCount++;
      }
      return result;
    },
    { income: 0n, expenses: 0n, incomeCount: 0, expensesCount: 0 },
  );
}

function render() {
  if (!state.loaded) return;
  const rows = periodRows();
  const summary = totals(rows);
  const balance = summary.income - summary.expenses;
  dashboardMotion.money($("#balance"), formatMoney(balance), state.hidden);
  dashboardMotion.money(
    $("#income"),
    formatMoney(summary.income),
    state.hidden,
  );
  dashboardMotion.money(
    $("#expenses"),
    formatMoney(summary.expenses),
    state.hidden,
  );
  dashboardMotion.money(
    $("#comparison-income"),
    formatMoney(summary.income),
    state.hidden,
  );
  dashboardMotion.money(
    $("#comparison-expenses"),
    formatMoney(summary.expenses),
    state.hidden,
  );
  $("#income-count").textContent = plural(
    summary.incomeCount,
    "entrada no período",
    "entradas no período",
  );
  $("#expenses-count").textContent = plural(
    summary.expensesCount,
    "saída no período",
    "saídas no período",
  );
  const rate =
    summary.income > 0n
      ? Number((balance * 1000n) / summary.income) / 10
      : null;
  $("#savings-rate").textContent =
    rate === null
      ? "—"
      : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(rate)}%`;
  $("#savings-progress").style.strokeDashoffset = String(
    100 - Math.max(0, Math.min(100, rate ?? 0)),
  );
  $("#balance-message").textContent = !rows.length
    ? "Seu próximo passo começa aqui"
    : balance < 0n
      ? "Um momento para olhar com carinho"
      : "Um passo de cada vez, mais longe";
  const largest =
    summary.income > summary.expenses ? summary.income : summary.expenses;
  $("#income-bar").style.width =
    `${largest ? Number((summary.income * 1000n) / largest) / 10 : 0}%`;
  $("#expense-bar").style.width =
    `${largest ? Number((summary.expenses * 1000n) / largest) / 10 : 0}%`;
  $("#insight-text").textContent = !rows.length
    ? "Seu primeiro lançamento transforma esse espaço em uma visão do seu dinheiro."
    : balance < 0n
      ? `As saídas superaram as entradas em ${formatMoney(-balance)} neste período.`
      : summary.income === 0n
        ? "Ainda não há receitas neste período."
        : `Neste período, ${formatMoney(balance)} das suas receitas ficaram com você.`;
  renderChart(rows);
  renderTransactions(rows);
}

function renderTransactions(rows) {
  const previousPositions = dashboardMotion.captureRows($("#transaction-list"));
  const query = normalize(state.search.trim());
  const filtered = rows.filter(
    (item) =>
      (state.type === "all" || item.type === state.type) &&
      normalize(item.description).includes(query),
  );
  filtered.sort((a, b) => {
    if (state.sort === "amount" && a.cents !== b.cents)
      return a.cents > b.cents ? -1 : 1;
    const order =
      a.date === b.date
        ? BigInt(a.id) === BigInt(b.id)
          ? 0
          : BigInt(a.id) > BigInt(b.id)
            ? -1
            : 1
        : b.date.localeCompare(a.date);
    return state.sort === "oldest" ? -order : order;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  state.page = Math.min(state.page, pages - 1);
  const start = state.page * state.pageSize;
  const visible = filtered.slice(start, start + state.pageSize);
  $("#transactions-count").textContent = plural(
    filtered.length,
    "lançamento",
    "lançamentos",
  );
  $("#pagination-label").textContent = filtered.length
    ? `Exibindo ${start + 1}–${start + visible.length} de ${filtered.length}`
    : "Nenhum lançamento para exibir";
  $("#page-label").textContent = `${state.page + 1} / ${pages}`;
  $("#previous-page").disabled = state.page === 0;
  $("#next-page").disabled = state.page === pages - 1;
  $("#transaction-list").replaceChildren();
  $("#transactions-empty").hidden = filtered.length > 0;
  const hasHistoryFilter = state.type !== "all" || Boolean(query);
  $("#empty-title").textContent = hasHistoryFilter
    ? "Vamos olhar de outro jeito?"
    : "Um novo começo.";
  $("#empty-description").textContent = hasHistoryFilter
    ? "Nenhum lançamento corresponde a essa busca."
    : state.period !== "all" && state.transactions.length
      ? "Não há movimentos no período selecionado."
      : "Seu histórico começa com o primeiro lançamento.";
  $("#clear-filters").hidden = !hasHistoryFilter;
  $("#empty-create").hidden = hasHistoryFilter;
  for (const item of visible) {
    const income = item.type === "RECEITA";
    const row = document.createElement("li");
    row.dataset.id = item.id;
    row.className = `transaction-row ${income ? "is-income" : "is-expense"}`;
    const identity = document.createElement("div");
    identity.className = "transaction-identity";
    const symbol = document.createElement("span");
    symbol.className = "transaction-icon";
    symbol.innerHTML = icon(income ? "in" : "out");
    const information = document.createElement("div");
    information.style.minWidth = "0";
    const name = document.createElement("p");
    name.className = "transaction-name";
    name.textContent = item.description;
    const kind = document.createElement("span");
    kind.className = "transaction-kind";
    kind.textContent = income ? "Entrada" : "Saída";
    information.append(name, kind);
    identity.append(symbol, information);
    const date = document.createElement("time");
    date.className = "transaction-date";
    date.dateTime = item.date;
    date.textContent = dateFormatter.format(dayDate(dayNumber(item.date)));
    const amount = document.createElement("p");
    amount.className = "transaction-amount money";
    amount.textContent = `${state.hidden ? "" : income ? "+ " : "− "}${formatMoney(item.cents)}`;
    const actions = document.createElement("div");
    actions.className = "row-actions";
    for (const action of ["edit", "delete"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `icon-button ${action === "delete" ? "delete-action" : ""}`;
      button.dataset.action = action;
      button.dataset.id = item.id;
      const label = `${action === "edit" ? "Editar" : "Excluir"} ${item.description}`;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML = icon(action === "edit" ? "edit" : "trash");
      actions.append(button);
    }
    row.append(identity, date, amount, actions);
    $("#transaction-list").append(row);
  }
  dashboardMotion.rows($("#transaction-list"), previousPositions);
}

// 04. SVG: desenhamos apenas o resultado acumulado dos lançamentos existentes.
function svgNode(name, attributes = {}, text) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildSeries(rows) {
  if (!rows.length) return [];
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const today = dayNumber(todayISO());
  let start = dayNumber(sorted[0].date);
  let end = Math.max(today, dayNumber(sorted.at(-1).date));
  if (state.period === "month")
    start = dayNumber(`${todayISO().slice(0, 7)}-01`);
  if (state.period === "previous") {
    const date = new Date();
    const first = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const last = new Date(date.getFullYear(), date.getMonth(), 0);
    start = dayNumber(
      `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`,
    );
    end = dayNumber(
      `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${last.getDate()}`,
    );
  }
  if (state.period === "last90") {
    start = today - 89;
    end = today;
  }
  if (start === end) start -= 6;
  const count = Math.min(31, end - start + 1);
  let cursor = 0;
  let value = 0n;
  const points = [];
  for (let i = 0; i < count; i++) {
    const day = start + Math.round(((end - start) * i) / (count - 1));
    while (cursor < sorted.length && dayNumber(sorted[cursor].date) <= day) {
      const item = sorted[cursor++];
      value += item.type === "RECEITA" ? item.cents : -item.cents;
    }
    points.push({ day, value });
  }
  return points;
}

function renderChart(rows) {
  const svg = $("#flow-chart");
  const width = Math.max(260, $("#chart-wrap").clientWidth);
  const height = 210;
  const left = 48;
  const right = 12;
  const top = 18;
  const bottom = 18;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-describedby", "chart-description");
  svg.replaceChildren();
  $("#chart-tooltip").hidden = true;
  const points = buildSeries(rows);
  state.chart = points;
  $("#chart-empty").hidden = points.length > 0;
  $("#chart-start").textContent = points.length
    ? shortDateFormatter.format(dayDate(points[0].day))
    : "—";
  $("#chart-end").textContent = points.length
    ? shortDateFormatter.format(dayDate(points.at(-1).day))
    : "—";
  let low = points.reduce(
    (value, point) => (point.value < value ? point.value : value),
    0n,
  );
  let high = points.reduce(
    (value, point) => (point.value > value ? point.value : value),
    0n,
  );
  if (high === low) high = low + 100n;
  const range = high - low;
  const y = (value) =>
    top +
    (1 - Number(((value - low) * 100000n) / range) / 100000) *
      (height - top - bottom);
  for (let index = 0; index < 4; index++) {
    const value = high - (range * BigInt(index)) / 3n;
    const position = top + (index * (height - top - bottom)) / 3;
    svg.append(
      svgNode("line", {
        x1: left,
        x2: width - right,
        y1: position,
        y2: position,
        class: "chart-grid",
      }),
    );
    const label = state.hidden
      ? "•••"
      : new Intl.NumberFormat("pt-BR", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(Number(value) / 100);
    svg.append(
      svgNode(
        "text",
        {
          x: left - 8,
          y: position + 3,
          "text-anchor": "end",
          class: "chart-axis",
        },
        label,
      ),
    );
  }
  if (!points.length) {
    $("#chart-description").textContent = "Nenhuma transação no período.";
    return;
  }
  points.forEach((point, index) => {
    point.x = left + (index * (width - left - right)) / (points.length - 1);
    point.y = y(point.value);
  });
  const defs = svgNode("defs");
  const gradient = svgNode("linearGradient", {
    id: "flow-fill",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });
  gradient.append(
    svgNode("stop", {
      offset: "0%",
      "stop-color": "var(--plot)",
      "stop-opacity": ".2",
    }),
    svgNode("stop", {
      offset: "100%",
      "stop-color": "var(--plot)",
      "stop-opacity": "0",
    }),
  );
  defs.append(gradient);
  svg.append(defs);
  const line = points
    .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
    .join(" ");
  svg.append(
    svgNode("path", {
      d: `${line} L${points.at(-1).x},${y(0n)} L${points[0].x},${y(0n)} Z`,
      fill: "url(#flow-fill)",
      class: "chart-area",
    }),
    svgNode("path", { d: line, class: "chart-line" }),
  );
  svg.append(
    svgNode("line", {
      id: "chart-cursor",
      x1: points.at(-1).x,
      x2: points.at(-1).x,
      y1: top,
      y2: height - bottom,
      class: "chart-cursor",
      visibility: "hidden",
    }),
    svgNode("circle", {
      id: "chart-point",
      cx: points.at(-1).x,
      cy: points.at(-1).y,
      r: 4,
      class: "chart-point",
    }),
  );
  $("#chart-description").textContent =
    `Resultado acumulado no período: ${formatMoney(points.at(-1).value)}. Use as setas para explorar as datas.`;
  dashboardMotion.chart(
    svg,
    `${width}:${points.map((point) => `${point.day}:${point.value}`).join("|")}`,
  );
}

function showChartPoint(index) {
  if (!state.chart.length) return;
  index = Math.max(0, Math.min(state.chart.length - 1, index));
  state.chartIndex = index;
  const point = state.chart[index];
  $("#chart-cursor").setAttribute("x1", point.x);
  $("#chart-cursor").setAttribute("x2", point.x);
  $("#chart-cursor").setAttribute("visibility", "visible");
  $("#chart-point").setAttribute("cx", point.x);
  $("#chart-point").setAttribute("cy", point.y);
  $("#chart-tooltip-date").textContent = dateFormatter.format(
    dayDate(point.day),
  );
  $("#chart-tooltip-value").textContent = formatMoney(point.value);
  $("#chart-tooltip").hidden = false;
  $("#chart-tooltip").style.left =
    `${Math.min(Math.max(point.x - 55, 0), Math.max(0, $("#chart-wrap").clientWidth - 135))}px`;
  $("#chart-description").textContent =
    `${dateFormatter.format(dayDate(point.day))}: ${formatMoney(point.value)}.`;
}

// 05. Cadastro e edição usam o mesmo formulário e os endpoints que estudamos.
function openTransaction(type = "RECEITA", id = null) {
  if (state.saving || $("#transaction-dialog").open || $("#delete-dialog").open)
    return;
  const item =
    id === null ? null : state.transactions.find((entry) => entry.id === id);
  if (id !== null && !item) return;
  state.editingId = id;
  previousFocus = document.activeElement;
  $("#transaction-form").reset();
  $("#amount-input").setCustomValidity("");
  $("#form-error").hidden = true;
  $("#dialog-title").textContent =
    id === null ? "Nova transação." : "Editar transação.";
  $("#transaction-form").elements.type.value = item?.type ?? type;
  $("#description-input").value = item?.description ?? "";
  $("#date-input").value = item?.date ?? todayISO();
  $("#amount-input").value = item
    ? centsToDecimal(item.cents).replace(".", ",")
    : "";
  $("#transaction-dialog").showModal();
  requestAnimationFrame(() => $("#amount-input").focus());
}

function closeTransaction() {
  if (!state.saving) $("#transaction-dialog").close();
}

async function saveTransaction(event) {
  event.preventDefault();
  if (state.saving || !$("#transaction-dialog").open) return;
  const form = $("#transaction-form");
  $("#form-error").hidden = true;
  $("#amount-input").setCustomValidity("");
  $("#description-input").setCustomValidity("");
  let cents;
  try {
    cents = inputToCents($("#amount-input").value);
  } catch (error) {
    $("#amount-input").setCustomValidity(error.message);
  }
  const description = $("#description-input").value.trim();
  if (!description)
    $("#description-input").setCustomValidity(
      "Dê uma descrição ao lançamento.",
    );
  if (!form.reportValidity()) return;
  const id = state.editingId;
  const payload = {
    description,
    date: $("#date-input").value,
    amount: centsToDecimal(cents),
    type: form.elements.type.value,
  };
  state.saving = true;
  setFormBusy(true);
  try {
    await api(id === null ? "/api/transactions" : `/api/transactions/${id}`, {
      method: id === null ? "POST" : "PUT",
      body: JSON.stringify(payload),
    });
    state.saving = false;
    $("#transaction-dialog").close();
    showToast(
      id === null ? "Novo movimento, tudo no lugar." : "Transação atualizada.",
    );
    await refresh();
  } catch (error) {
    $("#form-error").textContent =
      error instanceof TypeError
        ? "Não foi possível confirmar o salvamento. Atualize o histórico antes de tentar novamente."
        : error.message;
    $("#form-error").hidden = false;
  } finally {
    state.saving = false;
    setFormBusy(false);
  }
}

function setFormBusy(busy) {
  $("#transaction-form").setAttribute("aria-busy", String(busy));
  $("#save-transaction").disabled = busy;
  $("#close-dialog").disabled = busy;
  $("#cancel-dialog").disabled = busy;
  $("#save-transaction span").textContent = busy
    ? "Salvando…"
    : "Salvar transação";
}

function openDelete(id) {
  const item = state.transactions.find((entry) => entry.id === id);
  if (
    !item ||
    state.deleting ||
    $("#transaction-dialog").open ||
    $("#delete-dialog").open
  )
    return;
  previousFocus = document.activeElement;
  state.deletingId = id;
  $("#delete-description").textContent =
    `${item.description} · ${formatMoney(item.cents)}`;
  $("#delete-error").hidden = true;
  $("#delete-dialog").showModal();
  $("#cancel-delete").focus();
}

async function confirmDelete() {
  if (state.deleting || state.deletingId === null || !$("#delete-dialog").open)
    return;
  state.deleting = true;
  $("#confirm-delete").disabled = true;
  $("#cancel-delete").disabled = true;
  $("#confirm-delete").textContent = "Excluindo…";
  $("#delete-error").hidden = true;
  try {
    await api(`/api/transactions/${state.deletingId}`, { method: "DELETE" });
    state.deleting = false;
    $("#delete-dialog").close();
    showToast("Transação excluída do histórico.");
    await refresh();
  } catch (error) {
    $("#delete-error").textContent =
      error instanceof TypeError
        ? "Não foi possível confirmar a exclusão. Atualize o histórico para conferir."
        : error.message;
    $("#delete-error").hidden = false;
  } finally {
    state.deleting = false;
    $("#confirm-delete").disabled = false;
    $("#cancel-delete").disabled = false;
    $("#confirm-delete").textContent = "Excluir transação";
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  const version = ++toastVersion;
  $("#toast-message").textContent = message;
  $("#toast").hidden = false;
  dashboardMotion.toast($("#toast"), true);
  toastTimer = setTimeout(() => {
    const exit = dashboardMotion.toast($("#toast"), false);
    if (exit)
      exit.finished
        .catch(() => {})
        .then(() => {
          if (version === toastVersion) $("#toast").hidden = true;
        });
    else $("#toast").hidden = true;
  }, 4200);
}
function setTheme(theme) {
  dashboardMotion.applyTheme(() => {
    document.documentElement.dataset.theme = theme;
    $("#theme-toggle").innerHTML = icon(theme === "dark" ? "sun" : "moon");
    const label = `Ativar tema ${theme === "dark" ? "claro" : "escuro"}`;
    $("#theme-toggle").setAttribute("aria-label", label);
    $("#theme-toggle").title = label;
  });
  writePreference("financeflow-theme", theme);
}
function setPrivacy(hidden) {
  dashboardMotion.privacy();
  state.hidden = hidden;
  $("#privacy-toggle").innerHTML = icon(hidden ? "eye-off" : "eye");
  $("#privacy-toggle").setAttribute("aria-pressed", String(hidden));
  const label = `${hidden ? "Mostrar" : "Ocultar"} valores`;
  $("#privacy-toggle").setAttribute("aria-label", label);
  $("#privacy-toggle").title = label;
  writePreference("financeflow-private", String(hidden));
  render();
}

// 06. Eventos: escutamos ações em vez de colocar JavaScript no HTML.
document
  .querySelectorAll("[data-new]")
  .forEach((button) =>
    button.addEventListener("click", () => openTransaction(button.dataset.new)),
  );
$("#transaction-form").addEventListener("submit", saveTransaction);
$("#close-dialog").addEventListener("click", closeTransaction);
$("#cancel-dialog").addEventListener("click", closeTransaction);
$("#transaction-dialog").addEventListener("cancel", (event) => {
  if (state.saving) event.preventDefault();
});
$("#delete-dialog").addEventListener("cancel", (event) => {
  if (state.deleting) event.preventDefault();
});
for (const dialog of document.querySelectorAll("dialog"))
  dialog.addEventListener("close", () => {
    if (previousFocus?.isConnected) previousFocus.focus();
    else $("[data-new]").focus();
  });
$("#cancel-delete").addEventListener("click", () => {
  if (!state.deleting) $("#delete-dialog").close();
});
$("#confirm-delete").addEventListener("click", confirmDelete);
$("#amount-input").addEventListener("input", () =>
  $("#amount-input").setCustomValidity(""),
);
$("#description-input").addEventListener("input", () =>
  $("#description-input").setCustomValidity(""),
);
$("#transaction-list").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  button.dataset.action === "edit"
    ? openTransaction("RECEITA", button.dataset.id)
    : openDelete(button.dataset.id);
});
$("#theme-toggle").addEventListener("click", () =>
  dashboardMotion.theme(() =>
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    ),
  ),
);
$("#privacy-toggle").addEventListener("click", () => setPrivacy(!state.hidden));
$("#refresh-button").addEventListener("click", refresh);
$("#retry-button").addEventListener("click", refresh);
$("#period-select").addEventListener("change", (event) => {
  state.period = event.target.value;
  state.page = 0;
  render();
});
document.querySelectorAll("[data-type]").forEach((button) =>
  button.addEventListener("click", () => {
    state.type = button.dataset.type;
    state.page = 0;
    document
      .querySelectorAll("[data-type]")
      .forEach((tab) =>
        tab.setAttribute("aria-pressed", String(tab === button)),
      );
    if (state.loaded) renderTransactions(periodRows());
  }),
);
$("#transaction-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  state.page = 0;
  if (state.loaded) renderTransactions(periodRows());
});
$("#sort-select").addEventListener("change", (event) => {
  state.sort = event.target.value;
  state.page = 0;
  if (state.loaded) renderTransactions(periodRows());
});
$("#previous-page").addEventListener("click", () => {
  state.page = Math.max(0, state.page - 1);
  renderTransactions(periodRows());
});
$("#next-page").addEventListener("click", () => {
  state.page++;
  renderTransactions(periodRows());
});
$("#clear-filters").addEventListener("click", () => {
  state.search = "";
  state.type = "all";
  state.page = 0;
  $("#transaction-search").value = "";
  document
    .querySelectorAll("[data-type]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.type === "all"),
      ),
    );
  renderTransactions(periodRows());
});
$("#flow-chart").addEventListener("pointermove", (event) => {
  if (!state.chart.length || event.pointerType === "touch") return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x =
    ((event.clientX - rect.left) / rect.width) *
    event.currentTarget.viewBox.baseVal.width;
  const index = state.chart.reduce(
    (best, point, current) =>
      Math.abs(point.x - x) < Math.abs(state.chart[best].x - x)
        ? current
        : best,
    0,
  );
  showChartPoint(index);
});
$("#flow-chart").addEventListener("pointerleave", () => {
  if (document.activeElement !== $("#flow-chart")) {
    $("#chart-tooltip").hidden = true;
    $("#chart-cursor")?.setAttribute("visibility", "hidden");
  }
});
$("#flow-chart").addEventListener("focus", () =>
  showChartPoint(state.chart.length - 1),
);
$("#flow-chart").addEventListener("blur", () => {
  $("#chart-tooltip").hidden = true;
  $("#chart-cursor")?.setAttribute("visibility", "hidden");
});
$("#flow-chart").addEventListener("keydown", (event) => {
  if (
    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) &&
    state.chart.length
  ) {
    event.preventDefault();
    const current = state.chartIndex ?? state.chart.length - 1;
    showChartPoint(
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? state.chart.length - 1
          : current + (event.key === "ArrowLeft" ? -1 : 1),
    );
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    $("#transaction-dialog").open ||
    $("#delete-dialog").open ||
    event.target.closest("input, textarea, select, [contenteditable='true']")
  )
    return;
  if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    openTransaction();
  }
  if (event.key === "/") {
    event.preventDefault();
    $("#transaction-search").focus();
  }
});
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.loaded) renderChart(periodRows());
  }, 100);
});
function activateNavigation(id) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.hash === `#${id}`;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
document
  .querySelectorAll(".nav-link")
  .forEach((link) =>
    link.addEventListener("click", () =>
      activateNavigation(link.hash.slice(1)),
    ),
  );
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting)
        activateNavigation(
          entry.target.classList.contains("intro")
            ? "overview"
            : entry.target.id,
        );
  },
  { rootMargin: "-10% 0px -65% 0px" },
);
for (const element of [$(".intro"), $("#flow"), $("#transactions")])
  sectionObserver.observe(element);

// 07. Inicialização: preferências, data local e primeiro GET.
$("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date());
setTheme(
  readPreference("financeflow-theme", "dark") === "light" ? "light" : "dark",
);
setPrivacy(readPreference("financeflow-private", "false") === "true");
refresh();
