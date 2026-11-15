const withTimeout = (promise, label, ms = 15000) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(label + ": tiempo agotado. Revisa tu conexión e inténtalo de nuevo.")), ms))]);
// Tema de gráficos: colores de la paleta Monetra sobre fondo oscuro
(function themeCharts() {
  if (!window.Chart || !Chart.defaults || typeof Chart.register !== "function") return;
  const PAL_DARK = ["#e8456b", "#ff7a5c", "#ffcf4a", "#b0236b", "#8a5cd0", "#ffb25a", "#ff9db3", "#d9b8ff"];
  const PAL_LIGHT = ["#6c1f7c", "#1f9d57", "#e0a21b", "#17408f", "#d92d4f", "#8f3da3", "#0d9488", "#c2410c"];
  const pal = () => (document.documentElement.getAttribute("data-theme") === "light" ? PAL_LIGHT : PAL_DARK);
  window.MonetraPal = pal;
  if (window.MonetraTheme) MonetraTheme.applyChart(); else { Chart.defaults.color = "#cdb8da"; Chart.defaults.borderColor = "rgba(255,255,255,.09)"; }
  Chart.defaults.font.family = "Outfit, system-ui, sans-serif";
  if (Chart.defaults.plugins && Chart.defaults.plugins.colors) Chart.defaults.plugins.colors.enabled = false;
  Chart.register({
    id: "monetraPalette",
    beforeUpdate(chart) {
      chart.data.datasets.forEach((ds, i) => {
        if (ds._themed) return;
        ds._themed = true;
        const t = ds.type || chart.config.type, c = pal()[i % pal().length];
        if (t === "pie" || t === "doughnut" || t === "polarArea") {
          if (!ds.backgroundColor) ds.backgroundColor = (ds.data || []).map((_, k) => pal()[k % pal().length]);
        } else if (t === "line") {
          if (!ds.borderColor) ds.borderColor = c;
          if (!ds.backgroundColor) ds.backgroundColor = c + "33";
        } else {
          if (!ds.backgroundColor) ds.backgroundColor = c;
          if (!ds.borderColor) ds.borderColor = c;
        }
      });
    }
  });
})();
const $ = id => document.getElementById(id) || document.createElement("div"); // tolerante si el HTML en caché es antiguo

const pageTitle = document.getElementById("pageTitle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const sections = document.querySelectorAll(".page-section");

const form = document.getElementById("transactionForm");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const categorySelect = document.getElementById("categorySelect");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");

const categoryForm = document.getElementById("categoryForm");
const categoryNameInput = document.getElementById("categoryName");
const categoryKindInput = document.getElementById("categoryKind");
const categorySubmitBtn = document.getElementById("categorySubmitBtn");
const categoryCancelBtn = document.getElementById("categoryCancelBtn");
const categoriesTable = document.getElementById("categoriesTable");

const monthFilter = document.getElementById("monthFilter");
const yearFilter = document.getElementById("yearFilter");

const totalIncomeEl = document.getElementById("totalIncome");
const totalFixedEl = document.getElementById("totalFixed");
const totalVariableEl = document.getElementById("totalVariable");
const savingsBalanceEl = document.getElementById("savingsBalance");
const transactionTable = document.getElementById("transactionTable");
const monthlyDetailTable = document.getElementById("monthlyDetailTable");
const exportBtn = document.getElementById("exportBtn");

const analyticsCards = document.getElementById("analyticsCards");
const analyticsCategoryTable = document.getElementById("analyticsCategoryTable");
const insightsList = document.getElementById("insightsList");
const ruleTable = document.getElementById("ruleTable");
const comparisonTable = document.getElementById("comparisonTable");
const averageTable = document.getElementById("averageTable");
const projectionTable = document.getElementById("projectionTable");
const alertsList = document.getElementById("alertsList");
const suggestionsList = document.getElementById("suggestionsList");
const paretoTable = document.getElementById("paretoTable");
const categoryVarianceTable = document.getElementById("categoryVarianceTable");
const recurringTable = document.getElementById("recurringTable");
const variableAnalysisTable = document.getElementById("variableAnalysisTable");
const categoryMatrixHead = document.getElementById("categoryMatrixHead");
const categoryMatrixBody = document.getElementById("categoryMatrixBody");
const financialScoreBox = document.getElementById("financialScoreBox");
const scoreBreakdownTable = document.getElementById("scoreBreakdownTable");
const dataQualityTable = document.getElementById("dataQualityTable");
const optimizationTable = document.getElementById("optimizationTable");

let monthlyChart = null;

let transactionsCache = [];
let categoriesCache = [];
let editingTransactionId = null;
let editingMonthOverride = null;
let editingCategoryId = null;

const MONTHS = {
  es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  fr: ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
};
const monthNames = MONTHS[I18n.lang] || MONTHS.es;

const isMobile = () => window.innerWidth <= 520;

const apiGetDB = () => Data.getDB();
const apiCreateTransaction = transaction => Data.createTransaction(transaction);
const apiUpdateTransaction = (id, transaction) => Data.updateTransaction(id, transaction);
const apiDeleteTransaction = id => Data.deleteTransaction(id);
const apiCreateCategory = category => Data.createCategory(category);
const apiUpdateCategory = (id, category) => Data.updateCategory(id, category);
const apiDeleteCategory = id => Data.deleteCategory(id);

// Cada movimiento conserva su monto en SU moneda (amountOrig); 'amount' es el monto convertido a la moneda elegida.
const txCur = t => t.currency || MonetraFX.LEGACY;
function applyFx() {
  transactionsCache.forEach(t => { t.amount = MonetraFX.convert(t.amountOrig, txCur(t), MonetraFX.display); });
}

async function refreshData() {
  const db = await apiGetDB();
  transactionsCache = (db.transactions || []).map(t => ({ ...t, amountOrig: t.amount }));
  categoriesCache = db.categories || [];
  applyFx();
}

function formatCurrency(value) {
  return MonetraFX.format(value);
}

function pct(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(1)}%`;
}

function getCurrentDateValue() {
  return new Date().toISOString().split("T")[0];
}

function getDateParts(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate()
  };
}

function getMonth(dateString) {
  return getDateParts(dateString).month;
}

function getYear(dateString) {
  return getDateParts(dateString).year;
}

function getLastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildMonthlyDate(originalDate, targetYear, targetMonth) {
  const originalDay = getDateParts(originalDate).day;
  const lastDay = getLastDayOfMonth(targetYear, targetMonth);
  const validDay = Math.min(originalDay, lastDay);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(validDay).padStart(2, "0")}`;
}

function isSameOrAfterMonth(targetYear, targetMonth, startDate) {
  const start = getDateParts(startDate);
  return targetYear > start.year || (targetYear === start.year && targetMonth >= start.month);
}

function getTypeLabel(type) {
  const labels = {
    income: "Ingreso",
    fixed: "Gasto fijo",
    variable: "Gasto variable",
    savings: "Ahorro"
  };

  return T(labels[type] || type);
}

function getCategoryName(categoryId) {
  const category = categoriesCache.find(item => item.id === categoryId);
  return category ? category.name : "Sin categoría";
}

function setupFilters() {
  const currentYear = new Date().getFullYear();

  monthFilter.innerHTML = "";
  yearFilter.innerHTML = "";

  monthNames.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = month;
    monthFilter.appendChild(option);
  });

  const years = new Set(transactionsCache.map(item => getYear(item.date)));
  years.add(currentYear);

  Array.from(years).sort((a, b) => b - a).forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  monthFilter.value = new Date().getMonth();
  yearFilter.value = currentYear;
}

function setupYearFilterIfNeeded() {
  const selectedYear = yearFilter.value;
  const years = new Set(transactionsCache.map(item => String(getYear(item.date))));
  years.add(String(new Date().getFullYear()));

  if (!years.has(selectedYear)) years.add(selectedYear);

  const currentOptions = Array.from(yearFilter.options).map(option => option.value);
  const newOptions = Array.from(years).sort((a, b) => Number(b) - Number(a));

  if (JSON.stringify(currentOptions) !== JSON.stringify(newOptions)) {
    yearFilter.innerHTML = "";

    newOptions.forEach(year => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearFilter.appendChild(option);
    });

    yearFilter.value = selectedYear;
  }
}

function renderCategoryOptions() {
  const selectedType = typeInput.value;
  const selectedValue = categorySelect.value;

  const categories = categoriesCache
    .filter(category => category.kind === selectedType)
    .sort((a, b) => a.name.localeCompare(b.name));

  categorySelect.innerHTML = "";
  $("inlineCat").classList.add("hidden");

  if (categories.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = T("Primero crea una categoría");
    categorySelect.appendChild(option);
  }

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  });

  if (categories.some(category => category.id === selectedValue)) {
    categorySelect.value = selectedValue;
  }
}

// ----- Crear una categoría sin salir del formulario -----
function openInlineCategory(prefill) {
  $("inlineCat").classList.remove("hidden");
  $("inlineCatKind").textContent = T("Se creará como:") + " " + getTypeLabel(typeInput.value);
  $("inlineCatName").value = prefill || "";
  $("inlineCatName").focus();
}

function closeInlineCategory() {
  $("inlineCat").classList.add("hidden");
  $("inlineCatName").value = "";
  const pending = [...categorySelect.options].find(o => o.value === "__new__");
  if (pending) {
    const wasSelected = categorySelect.value === "__new__";
    pending.remove();
    if (wasSelected) { const first = [...categorySelect.options].find(o => o.value); categorySelect.value = first ? first.value : ""; }
  }
}

async function saveInlineCategory() {
  const name = $("inlineCatName").value.trim();
  if (!name) { alert(T("Escribe un nombre para la categoría.")); return; }
  const kind = typeInput.value;
  try {
    const existing = categoriesCache.find(c => c.kind === kind && c.name.trim().toLowerCase() === name.toLowerCase());
    const cat = existing || await apiCreateCategory({ name, kind });
    await refreshData();
    renderCategoryOptions();
    renderCategoriesTable();
    categorySelect.value = cat.id;
    closeInlineCategory();
  } catch (error) {
    if (error.code === "limit_categories") MonetraPlan.upsell("categories");
    else alert(T(error.message));
  }
}

$("newCatBtn").addEventListener("click", () => {
  if (!$("inlineCat").classList.contains("hidden")) { $("inlineCatName").focus(); return; }
  openInlineCategory();
});
categorySelect.addEventListener("change", () => {
  // Si elige una categoría existente, se cierra el panel de "nueva categoría".
  if (categorySelect.value !== "__new__" && !$("inlineCat").classList.contains("hidden")) closeInlineCategory();
});
$("inlineCatSave").addEventListener("click", saveInlineCategory);
$("inlineCatCancel").addEventListener("click", closeInlineCategory);
$("inlineCatName").addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); saveInlineCategory(); }
  if (event.key === "Escape") closeInlineCategory();
});

// ----- Moneda del movimiento (Pro: varias monedas; Gratis: solo la moneda elegida en el perfil) -----
function renderCurrencySelect(selected) {
  const sel = $("currencySelect");
  const display = MonetraFX.display;
  const cur = selected || display;
  const pro = MonetraPlan.isPro();
  const codes = pro ? MonetraFX.list() : [...new Set([display, cur])];
  if (pro && !codes.includes(cur)) codes.push(cur);
  sel.innerHTML = codes.map(c => `<option value="${c}">${c} · ${MonetraFX.name(c)}</option>`).join("");
  if (!pro) {
    const lock = document.createElement("option");
    lock.value = "__pro__";
    lock.textContent = "🔒 " + T("Otras monedas (Pro)");
    sel.appendChild(lock);
  }
  sel.value = cur;
  sel.dataset.prev = cur;
}

$("currencySelect").addEventListener("change", () => {
  const sel = $("currencySelect");
  if (sel.value === "__pro__") { sel.value = sel.dataset.prev || MonetraFX.display; MonetraPlan.upsell("currency"); return; }
  sel.dataset.prev = sel.value;
});

function getRecurringOverride(parentRecurringId, year, month) {
  return transactionsCache.find(item =>
    item.type === "fixed_override" &&
    item.parentRecurringId === parentRecurringId &&
    Number(item.overrideYear) === Number(year) &&
    Number(item.overrideMonth) === Number(month)
  ) || null;
}

function getDeletedRecurringMarker(parentRecurringId, year, month) {
  return transactionsCache.find(item =>
    item.type === "fixed_deleted" &&
    item.parentRecurringId === parentRecurringId &&
    Number(item.overrideYear) === Number(year) &&
    Number(item.overrideMonth) === Number(month)
  ) || null;
}

function getTransactionsForMonth(year, month) {
  const normalTransactions = transactionsCache.filter(item => {
    if (item.type === "fixed") return false;
    if (item.type === "fixed_override") return false;
    if (item.type === "fixed_deleted") return false;
    return getMonth(item.date) === month && getYear(item.date) === year;
  });

  const recurringFixedExpenses = transactionsCache
    .filter(item => item.type === "fixed")
    .filter(item => isSameOrAfterMonth(year, month, item.date))
    .map(item => {
      const deletedMarker = getDeletedRecurringMarker(item.id, year, month);
      if (deletedMarker) return null;

      const override = getRecurringOverride(item.id, year, month);

      if (override) {
        return {
          ...override,
          originalId: item.id,
          id: override.id,
          date: override.date,
          type: "fixed",
          isGeneratedFixed: true,
          isMonthlyOverride: true,
          description: override.description || "Gasto fijo recurrente modificado para este mes"
        };
      }

      return {
        ...item,
        originalId: item.id,
        id: `${item.id}-${year}-${month}`,
        date: buildMonthlyDate(item.date, year, month),
        isGeneratedFixed: true,
        isMonthlyOverride: false,
        description: item.description || "Gasto fijo recurrente"
      };
    })
    .filter(Boolean);

  return [...normalTransactions, ...recurringFixedExpenses];
}

function getFilteredTransactions() {
  return getTransactionsForMonth(Number(yearFilter.value), Number(monthFilter.value));
}

function calculateTotals(transactions) {
  return transactions.reduce(
    (totals, item) => {
      if (item.type === "income") totals.income += item.amount;
      if (item.type === "fixed") totals.fixed += item.amount;
      if (item.type === "variable") totals.variable += item.amount;

      totals.expenses = totals.fixed + totals.variable;
      totals.savings = totals.income - totals.expenses;

      return totals;
    },
    { income: 0, fixed: 0, variable: 0, expenses: 0, savings: 0 }
  );
}

function getYearlyTotals(year = Number(yearFilter.value)) {
  return monthNames.map((month, index) => {
    const totals = calculateTotals(getTransactionsForMonth(year, index));

    return {
      month,
      income: totals.income,
      fixed: totals.fixed,
      variable: totals.variable,
      expenses: totals.expenses,
      savings: totals.savings
    };
  });
}

function getPreviousMonthInfo() {
  let year = Number(yearFilter.value);
  let month = Number(monthFilter.value) - 1;

  if (month < 0) {
    month = 11;
    year -= 1;
  }

  return {
    year,
    month,
    transactions: getTransactionsForMonth(year, month)
  };
}

function updateSummary() {
  const totals = calculateTotals(getFilteredTransactions());

  totalIncomeEl.textContent = formatCurrency(totals.income);
  totalFixedEl.textContent = formatCurrency(totals.fixed);
  totalVariableEl.textContent = formatCurrency(totals.variable);
  savingsBalanceEl.textContent = formatCurrency(totals.savings);
}

function groupByCategory(transactions, includeIncome = false) {
  const grouped = {};

  transactions.forEach(item => {
    if (!includeIncome && item.type === "income") return;

    const name = getCategoryName(item.categoryId);
    const key = item.categoryId || name;

    if (!grouped[key]) {
      grouped[key] = {
        category: name,
        type: item.type,
        amount: 0,
        count: 0
      };
    }

    grouped[key].amount += item.amount;
    grouped[key].count += 1;
  });

  return Object.values(grouped).sort((a, b) => b.amount - a.amount);
}

function renderMonthlyDetailTable() {
  const transactions = getFilteredTransactions();
  const totals = calculateTotals(transactions);

  const rows = transactions.map(item => ({
    amount: item.amount,
    category: getCategoryName(item.categoryId),
    description: item.description || "-",
    type: item.type,
    originalId: item.originalId || item.id
  }));

  rows.push({
    amount: totals.savings,
    category: "Saldo restante",
    description: "Ahorro del mes",
    type: "savings",
    originalId: null
  });

  monthlyDetailTable.innerHTML = "";

  if (rows.length === 0) {
    monthlyDetailTable.innerHTML = '<tr><td colspan="5">No hay información para mostrar.</td></tr>';
    return;
  }

  rows
    .sort((a, b) => {
      const order = { income: 1, fixed: 2, variable: 3, savings: 4 };
      return order[a.type] - order[b.type];
    })
    .forEach(item => {
      const row = document.createElement("tr");

      if (item.type === "income") row.classList.add("income-row");
      if (item.type === "fixed" || item.type === "variable") row.classList.add("expense-row");
      if (item.type === "savings") row.classList.add("savings-row");

      const action = item.type === "fixed"
        ? `<button class="edit" data-edit-month-id="${item.originalId}">Editar</button>`
        : "-";

      row.innerHTML = `
        <td>${formatCurrency(item.amount)}</td>
        <td>${item.category}</td>
        <td>${item.description}</td>
        <td>${getTypeLabel(item.type)}</td>
        <td>${action}</td>
      `;

      monthlyDetailTable.appendChild(row);
    });
}

function renderTransactionTable() {
  const transactions = getFilteredTransactions();
  transactionTable.innerHTML = "";

  if (transactions.length === 0) {
    transactionTable.innerHTML = '<tr><td colspan="6">No hay movimientos registrados para este mes.</td></tr>';
    return;
  }

  transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(item => {
      const row = document.createElement("tr");
      const deleteId = item.isGeneratedFixed ? item.originalId : item.id;
      const actions = item.isGeneratedFixed
        ? `<div class="row-actions">
            <button class="edit" data-edit-month-id="${item.originalId}">Editar este mes</button>
            <button class="edit" data-edit-transaction-id="${item.originalId}">Editar serie</button>
            ${item.isMonthlyOverride ? `<button class="secondary" data-restore-month-id="${item.id}">Quitar cambio del mes</button>` : ""}
            <button class="danger" data-delete-transaction-id="${item.originalId}" data-delete-month="1">Eliminar solo este mes</button>
            <button class="danger" data-delete-transaction-id="${item.originalId}">Eliminar serie</button>
          </div>`
        : `<button class="danger" data-delete-transaction-id="${item.id}">Eliminar</button>`;
      const deleteText = item.isGeneratedFixed ? "Eliminar serie" : "Eliminar";
      const description = item.isGeneratedFixed
        ? `${item.description || "-"} · Recurrente`
        : item.description || "-";

      row.innerHTML = `
        <td>${item.date}</td>
        <td>${getTypeLabel(item.type)}</td>
        <td>${getCategoryName(item.categoryId)}</td>
        <td>${description}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td>${actions}</td>
      `;

      transactionTable.appendChild(row);
    });
}

function renderCategoriesTable() {
  categoriesTable.innerHTML = "";

  if (categoriesCache.length === 0) {
    categoriesTable.innerHTML = '<tr><td colspan="4">No hay categorías registradas.</td></tr>';
    return;
  }

  categoriesCache
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
    .forEach(category => {
      const usage = transactionsCache.filter(transaction => transaction.categoryId === category.id).length;
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${category.name}</td>
        <td>${getTypeLabel(category.kind)}</td>
        <td>${usage} movimiento(s)</td>
        <td>
          <button class="edit" data-edit-category-id="${category.id}">Editar</button>
          <button class="danger" data-delete-category-id="${category.id}">Eliminar</button>
        </td>
      `;

      categoriesTable.appendChild(row);
    });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile() ? "bottom" : "top",
        labels: {
          boxWidth: isMobile() ? 12 : 40
        }
      },
      tooltip: {
        callbacks: {
          label: context => `${context.dataset.label || context.label}: ${formatCurrency(context.raw)}`
        }
      }
    }
  };
}

function renderMonthlyChartIn(canvasId, name) {
  const totals = calculateTotals(getFilteredTransactions());
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (name === "monthly" && monthlyChart) monthlyChart.destroy();

  const chart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Gastos fijos", "Gastos variables", "Ahorro"],
      datasets: [{
        label: "Monto",
        data: [
          Math.max(totals.fixed, 0),
          Math.max(totals.variable, 0),
          Math.max(totals.savings, 0)
        ]
      }]
    },
    options: chartOptions()
  });

  if (name === "monthly") monthlyChart = chart;
}

function rowClassByStatus(status) {
  if (status === "OK") return "good";
  if (status === "Revisar") return "warning";
  return "danger-text";
}

function renderAnalytics() {
  if (!analyticsCards || !analyticsCategoryTable || !ruleTable || !comparisonTable || !averageTable || !projectionTable || !alertsList || !suggestionsList || !insightsList) return;
  const selectedYear = Number(yearFilter.value);
  const selectedMonth = Number(monthFilter.value);

  const transactions = getFilteredTransactions();
  const totals = calculateTotals(transactions);
  const previous = calculateTotals(getPreviousMonthInfo().transactions);
  const grouped = groupByCategory(transactions, false);
  const groupedPrevious = groupByCategory(getPreviousMonthInfo().transactions, false);
  const top = grouped[0];

  const savingsRate = totals.income > 0 ? (totals.savings / totals.income) * 100 : 0;
  const expenseRate = totals.income > 0 ? (totals.expenses / totals.income) * 100 : 0;
  const fixedRate = totals.expenses > 0 ? (totals.fixed / totals.expenses) * 100 : 0;
  const variableRate = totals.expenses > 0 ? (totals.variable / totals.expenses) * 100 : 0;

  const yearly = getYearlyTotals();
  const activeMonths = yearly.filter(item => item.income || item.expenses || item.savings);
  const monthsCount = Math.max(activeMonths.length, 1);

  const yearIncome = yearly.reduce((sum, item) => sum + item.income, 0);
  const yearFixed = yearly.reduce((sum, item) => sum + item.fixed, 0);
  const yearVariable = yearly.reduce((sum, item) => sum + item.variable, 0);
  const yearExpenses = yearly.reduce((sum, item) => sum + item.expenses, 0);
  const yearSavings = yearly.reduce((sum, item) => sum + item.savings, 0);

  const avgIncome = yearIncome / monthsCount;
  const avgFixed = yearFixed / monthsCount;
  const avgVariable = yearVariable / monthsCount;
  const avgExpenses = yearExpenses / monthsCount;
  const avgSavings = yearSavings / monthsCount;

  const variableTransactions = transactions.filter(item => item.type === "variable");
  const fixedTransactions = transactions.filter(item => item.type === "fixed");
  const incomeTransactions = transactions.filter(item => item.type === "income");
  const avgVariableTicket = variableTransactions.length ? totals.variable / variableTransactions.length : 0;
  const maxVariable = variableTransactions.length ? Math.max(...variableTransactions.map(item => item.amount)) : 0;
  const minVariable = variableTransactions.length ? Math.min(...variableTransactions.map(item => item.amount)) : 0;
  const dailyBurn = totals.expenses / 30;

  analyticsCards.innerHTML = `
    <div class="analytics-card"><h4>Tasa de ahorro</h4><p>${pct(savingsRate)}</p><small>Ahorro / ingresos</small></div>
    <div class="analytics-card"><h4>Tasa de gasto</h4><p>${pct(expenseRate)}</p><small>Gastos / ingresos</small></div>
    <div class="analytics-card"><h4>Fijos sobre gastos</h4><p>${pct(fixedRate)}</p><small>Compromisos recurrentes</small></div>
    <div class="analytics-card"><h4>Variables sobre gastos</h4><p>${pct(variableRate)}</p><small>Gastos ajustables</small></div>
    <div class="analytics-card"><h4>Gasto diario estimado</h4><p>${formatCurrency(dailyBurn)}</p><small>Gasto mensual / 30</small></div>
    <div class="analytics-card"><h4>Ahorro proyectado</h4><p>${formatCurrency(avgSavings * 12)}</p><small>Promedio anualizado</small></div>
    <div class="analytics-card"><h4>Categoría dominante</h4><p>${top ? top.category : "-"}</p><small>${top ? formatCurrency(top.amount) : "Sin datos"}</small></div>
    <div class="analytics-card"><h4>Movimientos del mes</h4><p>${transactions.length}</p><small>${incomeTransactions.length} ingresos, ${fixedTransactions.length} fijos, ${variableTransactions.length} variables</small></div>
  `;

  // Top category table
  analyticsCategoryTable.innerHTML = "";
  if (grouped.length === 0) {
    analyticsCategoryTable.innerHTML = '<tr><td colspan="5">No hay gastos para analizar.</td></tr>';
  } else {
    grouped.forEach(item => {
      const percentIncome = totals.income > 0 ? (item.amount / totals.income) * 100 : 0;
      const percentExpense = totals.expenses > 0 ? (item.amount / totals.expenses) * 100 : 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.category}</td>
        <td>${getTypeLabel(item.type)}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td>${pct(percentIncome)}</td>
        <td>${pct(percentExpense)}</td>
      `;
      analyticsCategoryTable.appendChild(row);
    });
  }

  // Rule 50/30/20
  ruleTable.innerHTML = "";
  [
    { name: "Necesidades / fijos", amount: totals.fixed, value: totals.income > 0 ? totals.fixed / totals.income * 100 : 0, goal: "≤ 50%", limit: 50, mode: "max" },
    { name: "Variables", amount: totals.variable, value: totals.income > 0 ? totals.variable / totals.income * 100 : 0, goal: "≤ 30%", limit: 30, mode: "max" },
    { name: "Ahorro", amount: totals.savings, value: savingsRate, goal: "≥ 20%", limit: 20, mode: "min" }
  ].forEach(item => {
    const status = item.mode === "max"
      ? (item.value <= item.limit ? "OK" : "Revisar")
      : (item.value >= item.limit ? "OK" : "Bajo");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${formatCurrency(item.amount)}</td>
      <td>${pct(item.value)}</td>
      <td>${item.goal}</td>
      <td class="${rowClassByStatus(status)}">${status}</td>
    `;
    ruleTable.appendChild(row);
  });

  // Comparison
  comparisonTable.innerHTML = "";
  [
    ["Ingresos", totals.income, previous.income],
    ["Gastos fijos", totals.fixed, previous.fixed],
    ["Gastos variables", totals.variable, previous.variable],
    ["Gastos totales", totals.expenses, previous.expenses],
    ["Ahorro", totals.savings, previous.savings]
  ].forEach(([name, current, old]) => {
    const diff = current - old;
    const change = old !== 0 ? (diff / old) * 100 : 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${name}</td>
      <td>${formatCurrency(current)}</td>
      <td>${formatCurrency(old)}</td>
      <td class="${diff > 0 ? "warning" : diff < 0 ? "good" : ""}">${formatCurrency(diff)}</td>
      <td>${old === 0 ? "-" : pct(change)}</td>
    `;
    comparisonTable.appendChild(row);
  });

  // Averages
  averageTable.innerHTML = "";
  [
    ["Ingresos", avgIncome, yearIncome],
    ["Gastos fijos", avgFixed, yearFixed],
    ["Gastos variables", avgVariable, yearVariable],
    ["Gastos totales", avgExpenses, yearExpenses],
    ["Ahorro", avgSavings, yearSavings]
  ].forEach(([name, avg, total]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${name}</td><td>${formatCurrency(avg)}</td><td>${formatCurrency(total)}</td>`;
    averageTable.appendChild(row);
  });

  // Projection
  projectionTable.innerHTML = "";
  [
    ["Ingresos", avgIncome * 12, "Estimado según tus meses con datos"],
    ["Gastos", avgExpenses * 12, "Proyección de salida anual"],
    ["Ahorro", avgSavings * 12, avgSavings >= 0 ? "Vas en positivo si mantienes el ritmo" : "Riesgo de cerrar el año en negativo"],
    ["Gastos variables", avgVariable * 12, "Área con mayor capacidad de ajuste"]
  ].forEach(([name, value, comment]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${name}</td><td>${formatCurrency(value)}</td><td>${comment}</td>`;
    projectionTable.appendChild(row);
  });

  // Pareto table
  if (!paretoTable || !categoryVarianceTable || !recurringTable || !variableAnalysisTable || !categoryMatrixHead || !categoryMatrixBody || !financialScoreBox || !scoreBreakdownTable || !dataQualityTable || !optimizationTable) return;
  paretoTable.innerHTML = "";
  let cumulative = 0;
  let cumulativePareto = 0;
  if (grouped.length === 0) {
    paretoTable.innerHTML = '<tr><td colspan="6">No hay gastos para calcular Pareto.</td></tr>';
  } else {
    grouped.forEach((item, index) => {
      const share = totals.expenses > 0 ? item.amount / totals.expenses * 100 : 0;
      cumulative += share;
      cumulativePareto = cumulative;
      const priority = index < 3 || cumulative <= 80 ? "Alta" : cumulative <= 95 ? "Media" : "Baja";
      const priorityClass = priority === "Alta" ? "priority-high" : priority === "Media" ? "priority-medium" : "priority-low";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.category}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td>${pct(share)}</td>
        <td>${pct(cumulative)}</td>
        <td class="${priorityClass}">${priority}</td>
      `;
      paretoTable.appendChild(row);
    });
  }

  // Category variance
  categoryVarianceTable.innerHTML = "";
  const categoryNames = new Set([...grouped.map(item => item.category), ...groupedPrevious.map(item => item.category)]);
  if (categoryNames.size === 0) {
    categoryVarianceTable.innerHTML = '<tr><td colspan="5">No hay categorías para comparar.</td></tr>';
  } else {
    Array.from(categoryNames).forEach(category => {
      const current = grouped.find(item => item.category === category)?.amount || 0;
      const old = groupedPrevious.find(item => item.category === category)?.amount || 0;
      const diff = current - old;
      const change = old !== 0 ? diff / old * 100 : 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${category}</td>
        <td>${formatCurrency(current)}</td>
        <td>${formatCurrency(old)}</td>
        <td class="${diff > 0 ? "warning" : diff < 0 ? "good" : ""}">${formatCurrency(diff)}</td>
        <td>${old === 0 ? "-" : pct(change)}</td>
      `;
      categoryVarianceTable.appendChild(row);
    });
  }

  // Recurring commitments
  recurringTable.innerHTML = "";
  const recurring = transactionsCache
    .filter(item => item.type === "fixed")
    .sort((a, b) => getDateParts(a.date).day - getDateParts(b.date).day);

  if (recurring.length === 0) {
    recurringTable.innerHTML = '<tr><td colspan="4">No hay gastos fijos recurrentes registrados.</td></tr>';
  } else {
    recurring.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${getDateParts(item.date).day}</td>
        <td>${getCategoryName(item.categoryId)}</td>
        <td>${item.description || "-"}</td>
        <td>${formatCurrency(item.amount)}</td>
      `;
      recurringTable.appendChild(row);
    });
  }

  // Variable analysis
  variableAnalysisTable.innerHTML = "";
  [
    ["Cantidad de gastos variables", variableTransactions.length, "Frecuencia de consumo flexible"],
    ["Ticket promedio variable", formatCurrency(avgVariableTicket), "Promedio por movimiento variable"],
    ["Gasto variable más alto", formatCurrency(maxVariable), "Mayor salida flexible del mes"],
    ["Gasto variable más bajo", formatCurrency(minVariable), "Menor salida flexible del mes"],
    ["Variables sobre ingreso", pct(totals.income > 0 ? totals.variable / totals.income * 100 : 0), "Meta sugerida: máximo 30%"]
  ].forEach(([metric, value, reading]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${metric}</td><td>${value}</td><td>${reading}</td>`;
    variableAnalysisTable.appendChild(row);
  });

  // Category matrix by year
  categoryMatrixHead.innerHTML = "";
  categoryMatrixBody.innerHTML = "";
  const expenseCategories = categoriesCache
    .filter(category => category.kind !== "income")
    .sort((a, b) => a.name.localeCompare(b.name));

  categoryMatrixHead.innerHTML = `
    <tr>
      <th>Categoría</th>
      ${monthNames.map(month => `<th>${month.slice(0, 3)}</th>`).join("")}
      <th>Total</th>
    </tr>
  `;

  if (expenseCategories.length === 0) {
    categoryMatrixBody.innerHTML = '<tr><td colspan="14">No hay categorías de gasto.</td></tr>';
  } else {
    expenseCategories.forEach(category => {
      const monthlyAmounts = monthNames.map((_, monthIndex) => {
        return getTransactionsForMonth(selectedYear, monthIndex)
          .filter(item => item.categoryId === category.id && item.type !== "income")
          .reduce((sum, item) => sum + item.amount, 0);
      });
      const total = monthlyAmounts.reduce((sum, value) => sum + value, 0);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${category.name}</td>
        ${monthlyAmounts.map(value => `<td>${value ? formatCurrency(value) : "-"}</td>`).join("")}
        <td><strong>${formatCurrency(total)}</strong></td>
      `;
      categoryMatrixBody.appendChild(row);
    });
  }

  // Financial score
  let score = 100;
  const scoreFactors = [];

  function addScoreFactor(name, result, impact, penalty) {
    score -= penalty;
    scoreFactors.push({ name, result, impact });
  }

  if (totals.income === 0) addScoreFactor("Ingresos registrados", "Sin ingresos este mes", "Alto", 25);
  if (totals.savings < 0) addScoreFactor("Ahorro", "Ahorro negativo", "Alto", 30);
  if (savingsRate < 20 && totals.income > 0) addScoreFactor("Tasa de ahorro", `Solo ${pct(savingsRate)}`, "Medio", 15);
  if (expenseRate > 80) addScoreFactor("Tasa de gasto", `${pct(expenseRate)} del ingreso`, "Medio", 12);
  if (fixedRate > 60) addScoreFactor("Gastos fijos", `${pct(fixedRate)} del gasto total`, "Medio", 10);
  if (top && totals.expenses > 0 && top.amount / totals.expenses * 100 > 50) addScoreFactor("Concentración", `Más del 50% en ${top.category}`, "Medio", 8);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const scoreClass = score >= 75 ? "score-good" : score >= 50 ? "score-warning" : "score-danger";
  const scoreLabel = score >= 75 ? "Saludable" : score >= 50 ? "Revisar" : "Riesgo alto";

  financialScoreBox.innerHTML = `
    <p class="score-number ${scoreClass}">${score}/100</p>
    <p class="score-label ${scoreClass}">${scoreLabel}</p>
  `;

  scoreBreakdownTable.innerHTML = "";
  if (scoreFactors.length === 0) {
    scoreBreakdownTable.innerHTML = '<tr><td colspan="3">No se detectaron factores negativos fuertes.</td></tr>';
  } else {
    scoreFactors.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${item.name}</td><td>${item.result}</td><td>${item.impact}</td>`;
      scoreBreakdownTable.appendChild(row);
    });
  }

  // Data quality
  const allYearTransactions = [];
  monthNames.forEach((_, index) => {
    allYearTransactions.push(...getTransactionsForMonth(selectedYear, index));
  });

  const missingDescription = transactionsCache.filter(item => !item.description || !item.description.trim()).length;
  const zeroAmounts = transactionsCache.filter(item => Number(item.amount) <= 0).length;
  const categoriesWithoutUse = categoriesCache.filter(category => !transactionsCache.some(item => item.categoryId === category.id)).length;

  dataQualityTable.innerHTML = "";
  [
    ["Movimientos sin descripción", missingDescription, "Agrega descripciones para mejores reportes."],
    ["Movimientos con monto cero", zeroAmounts, "Corrige o elimina registros inválidos."],
    ["Categorías sin uso", categoriesWithoutUse, "Elimina o consolida categorías que no usas."],
    ["Meses con datos en el año", activeMonths.length, "Mientras más meses registres, mejores serán las proyecciones."]
  ].forEach(([check, result, suggestion]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${check}</td><td>${result}</td><td>${suggestion}</td>`;
    dataQualityTable.appendChild(row);
  });

  // Optimization plan
  optimizationTable.innerHTML = "";
  const targetSavings = totals.income * 0.20;
  const gap = Math.max(0, targetSavings - totals.savings);
  const adjustable = grouped.filter(item => item.type === "variable");
  if (gap <= 0) {
    optimizationTable.innerHTML = '<tr><td colspan="4">Ya cumples o superas una meta de ahorro del 20% este mes.</td></tr>';
  } else if (adjustable.length === 0) {
    optimizationTable.innerHTML = '<tr><td colspan="4">No hay gastos variables para sugerir reducción.</td></tr>';
  } else {
    const totalAdjustable = adjustable.reduce((sum, item) => sum + item.amount, 0);
    adjustable.slice(0, 5).forEach(item => {
      const proportionalCut = totalAdjustable > 0 ? gap * (item.amount / totalAdjustable) : 0;
      const safeCut = Math.min(item.amount * 0.25, proportionalCut);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.category}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td>${formatCurrency(safeCut)}</td>
        <td>${formatCurrency(Math.max(0, item.amount - safeCut))}</td>
      `;
      optimizationTable.appendChild(row);
    });
  }

  // Alerts, suggestions, insights
  const alerts = [];
  const suggestions = [];
  const insights = [];

  if (totals.income === 0) alerts.push("No hay ingresos registrados este mes; los porcentajes no serán totalmente útiles.");
  if (totals.savings < 0) alerts.push("Tus gastos superan tus ingresos: hay ahorro negativo.");
  if (expenseRate > 80) alerts.push("Tus gastos consumen más del 80% de tus ingresos.");
  if (fixedRate > 60) alerts.push("Tus gastos fijos pesan más del 60% de tus gastos totales.");
  if (top && totals.income > 0 && top.amount / totals.income * 100 > 35) alerts.push(`La categoría "${top.category}" supera el 35% de tus ingresos.`);
  if (grouped.length > 0 && cumulativePareto > 80 && grouped.length <= 3) alerts.push("Tus gastos están muy concentrados en pocas categorías.");

  if (totals.variable > totals.fixed) suggestions.push("Crea límites semanales para tus gastos variables; son el área con más oportunidad de ajuste.");
  if (savingsRate < 20 && totals.income > 0) suggestions.push("Automatiza el ahorro al inicio del mes para acercarte al 20%.");
  if (top) suggestions.push(`Revisa "${top.category}": es tu mayor salida y puede ser el mejor punto para optimizar.`);
  if (previous.expenses > 0 && totals.expenses > previous.expenses) suggestions.push("Tus gastos subieron vs el mes anterior; revisa la tabla de variación por categoría.");
  if (recurring.length > 0) suggestions.push("Revisa tus compromisos recurrentes cada 3 meses: suelen tener oportunidades de reducción.");
  if (missingDescription > 0) suggestions.push("Agrega descripciones a tus movimientos para mejorar la calidad del análisis.");

  if (totals.income === 0) {
    insights.push("Empieza registrando ingresos para que el análisis sea más preciso.");
  } else if (savingsRate >= 20) {
    insights.push("Tu ahorro está en una zona saludable según la regla 50/30/20.");
  } else {
    insights.push("Tu ahorro está por debajo del 20%; el sistema recomienda revisar gastos variables y pagos recurrentes.");
  }

  if (previous.expenses > 0) {
    const change = (totals.expenses - previous.expenses) / previous.expenses * 100;
    insights.push(`Tus gastos totales cambiaron ${pct(change)} frente al mes anterior.`);
  }

  if (activeMonths.length > 0) {
    insights.push(`Tu ahorro mensual promedio del año es ${formatCurrency(avgSavings)}.`);
  }

  if (top) {
    insights.push(`Tu mayor categoría representa ${pct(totals.expenses > 0 ? top.amount / totals.expenses * 100 : 0)} de tus gastos del mes.`);
  }

  alertsList.innerHTML = (alerts.length ? alerts : ["Sin alertas críticas para este mes."]).map(item => `<li>${item}</li>`).join("");
  suggestionsList.innerHTML = (suggestions.length ? suggestions : ["Agrega más movimientos para generar sugerencias más precisas."]).map(item => `<li>${item}</li>`).join("");
  insightsList.innerHTML = insights.map(item => `<li>${item}</li>`).join("");
}


function cumulativeArray(values) {
  let total = 0;
  return values.map(value => {
    total += value;
    return total;
  });
}

function renderCategoryHeatmap() {
  const container = document.getElementById("categoryHeatmap");
  if (!container) return;

  const selectedYear = Number(yearFilter.value);
  const expenseCategories = categoriesCache
    .filter(category => category.kind !== "income")
    .sort((a, b) => a.name.localeCompare(b.name));

  const matrix = expenseCategories.map(category => {
    const values = monthNames.map((_, monthIndex) => {
      return getTransactionsForMonth(selectedYear, monthIndex)
        .filter(item => item.categoryId === category.id && item.type !== "income")
        .reduce((sum, item) => sum + item.amount, 0);
    });

    return {
      category: category.name,
      values
    };
  });

  const maxValue = Math.max(0, ...matrix.flatMap(row => row.values));

  function heatClass(value) {
    if (!value || maxValue === 0) return "heat-0";
    const ratio = value / maxValue;
    if (ratio < 0.25) return "heat-1";
    if (ratio < 0.50) return "heat-2";
    if (ratio < 0.75) return "heat-3";
    return "heat-4";
  }

  container.innerHTML = `
    <div class="heatmap-grid">
      <div class="heatmap-head">Categoría</div>
      ${monthNames.map(month => `<div class="heatmap-head">${month.slice(0, 3)}</div>`).join("")}
      ${
        matrix.length === 0
          ? `<div class="heatmap-label">Sin categorías</div>${monthNames.map(() => `<div class="heatmap-cell heat-0">-</div>`).join("")}`
          : matrix.map(row => `
              <div class="heatmap-label">${row.category}</div>
              ${row.values.map(value => `<div class="heatmap-cell ${heatClass(value)}">${value ? formatCurrency(value) : "-"}</div>`).join("")}
            `).join("")
      }
    </div>
  `;
}

function renderAllProCharts() {
  renderMonthlyChartIn("monthlyChart", "monthly");
  renderExplorer();
}

// ===== Gráfico de análisis: un solo gráfico que cambia con los filtros =====
let explorerChart = null;

function exNormalize() {
  const e = { metric: $("exMetric"), group: $("exGroup"), period: $("exPeriod"), view: $("exView"), shape: $("exShape") };
  let metric = e.metric.value, group = e.group.value, period = e.period.value;
  const view = e.view.value;
  if (view === "pareto") { metric = "expenses"; group = "category"; }
  else if (view === "rule") { metric = "all"; group = "kind"; }
  else if (view === "cumulative") { group = "month"; }
  else if (view === "heatmap") { metric = "expenses"; group = "category"; period = "year"; }
  else {
    if (metric === "savings") group = "month";
    if (metric === "all" && group === "category") group = "month";
    if (metric === "income" && group === "kind") group = "category";
  }
  e.metric.value = metric; e.group.value = group; e.period.value = period;
  e.metric.disabled = view !== "normal" && view !== "cumulative";
  e.group.disabled = view !== "normal";
  e.period.disabled = view === "heatmap";
  e.shape.disabled = view === "heatmap" || view === "rule" || view === "pareto";
  [...e.group.options].forEach(o => {
    o.disabled = view === "normal" && ((metric === "savings" && o.value !== "month") || (metric === "all" && o.value === "category") || (metric === "income" && o.value === "kind"));
  });
  return { metric, group, view, period, shape: e.shape.value };
}

function exMonthList(period) {
  const y = Number(yearFilter.value), m = Number(monthFilter.value);
  if (period === "year") return Array.from({ length: 12 }, (_, i) => ({ year: y, month: i }));
  const n = Number(period) || 1, out = [];
  for (let i = n - 1; i >= 0; i--) {
    let mm = m - i, yy = y;
    while (mm < 0) { mm += 12; yy -= 1; }
    out.push({ year: yy, month: mm });
  }
  return out;
}

function exLabel(mo, period) {
  const name = monthNames[mo.month];
  if (period === "1") return name + " " + mo.year;
  if (period === "year") return isMobile() ? name.slice(0, 3) : name;
  return name.slice(0, 3) + " " + String(mo.year).slice(2);
}

function exBuild(o) {
  const months = exMonthList(o.period).map(mo => {
    const tx = getTransactionsForMonth(mo.year, mo.month);
    return { mo, label: exLabel(mo, o.period), tx, t: calculateTotals(tx) };
  });
  const allTx = months.flatMap(m => m.tx);
  const tot = calculateTotals(allTx);
  const pal = window.MonetraPal ? MonetraPal() : [];
  const money = formatCurrency;
  const share = (v, total) => (total > 0 ? pct(v / total * 100) : "—");
  const r = { type: "bar", labels: [], datasets: [], head: [], rows: [], hint: "", multi: false, fixedShape: false, percent: false, stacked: false, pareto: false };
  const metricName = { expenses: T("Gastos"), income: T("Ingresos"), savings: T("Ahorro") };

  if (o.view === "rule") {
    const inc = tot.income;
    const real = inc > 0 ? [tot.fixed / inc * 100, tot.variable / inc * 100, Math.max(tot.savings, 0) / inc * 100] : [0, 0, 0];
    const target = [50, 30, 20];
    r.labels = [T("Necesidades (gastos fijos)"), T("Gustos (gastos variables)"), T("Ahorro")];
    r.datasets = [{ label: T("Tu resultado"), data: real }, { label: T("Meta 50/30/20"), data: target }];
    r.percent = true; r.multi = true; r.fixedShape = true;
    r.head = [T("Grupo"), T("Monto"), T("% de tus ingresos"), T("Meta")];
    const amounts = [tot.fixed, tot.variable, Math.max(tot.savings, 0)];
    r.rows = r.labels.map((l, i) => [l, money(amounts[i]), inc > 0 ? pct(real[i]) : "—", target[i] + "%"]);
    r.hint = inc > 0
      ? T("Compara cómo se reparten tus ingresos con la regla 50/30/20. Los gastos fijos cuentan como necesidades y los variables como gustos.")
      : T("Aún no hay ingresos en este periodo.");
    return r;
  }

  if (o.view === "pareto") {
    const cats = groupByCategory(allTx, false);
    const total = cats.reduce((a, c) => a + c.amount, 0);
    let acc = 0, reached = 0;
    const cum = cats.map((c, i) => { acc += c.amount; const p = total > 0 ? acc / total * 100 : 0; if (!reached && p >= 80) reached = i + 1; return p; });
    r.labels = cats.map(c => c.category);
    r.datasets = [
      { label: T("Gasto"), data: cats.map(c => c.amount), yAxisID: "y", backgroundColor: pal[0] },
      { type: "line", label: T("% acumulado"), data: cum, yAxisID: "y2", tension: 0.2, pointRadius: 3, fill: false, borderColor: pal[2] || "#ffcf4a", backgroundColor: pal[2] || "#ffcf4a" }
    ];
    r.pareto = true; r.multi = true; r.fixedShape = true;
    r.head = [T("Categoría"), T("Monto"), T("% del total"), T("% acumulado")];
    r.rows = cats.map((c, i) => [c.category, money(c.amount), share(c.amount, total), pct(cum[i])]);
    r.hint = cats.length ? T("Pareto 80/20: pocas categorías concentran la mayor parte del gasto.") + " " + T("Aquí") + ": " + reached + " " + T(reached === 1 ? "categoría llega" : "categorías llegan") + " " + T("al 80%.") : T("Aún no hay gastos en este periodo.");
    return r;
  }

  if (o.view === "cumulative") {
    const defs = {
      expenses: [[T("Gastos"), m => m.t.expenses]],
      income: [[T("Ingresos"), m => m.t.income]],
      savings: [[T("Ahorro"), m => m.t.savings]],
      all: [[T("Ingresos"), m => m.t.income], [T("Gastos"), m => m.t.expenses], [T("Ahorro"), m => m.t.savings]]
    }[o.metric];
    r.type = "line"; r.multi = defs.length > 1;
    r.labels = months.map(m => m.label);
    const series = defs.map(d => ({ label: d[0], data: cumulativeArray(months.map(d[1])) }));
    r.datasets = series.map(sr => ({ label: sr.label, data: sr.data, tension: 0.25, fill: false }));
    r.head = [T("Mes"), ...series.map(sr => sr.label + " (" + T("acumulado") + ")")];
    r.rows = months.map((m, i) => [m.label, ...series.map(sr => money(sr.data[i]))]);
    r.hint = T("Suma mes a mes: así ves cómo crece tu ahorro o tu gasto con el tiempo.");
    return r;
  }

  if (o.group === "category") {
    const cats = o.metric === "income" ? groupByCategory(allTx, true).filter(c => c.type === "income") : groupByCategory(allTx, false);
    const total = cats.reduce((a, c) => a + c.amount, 0);
    r.labels = cats.map(c => c.category);
    r.datasets = [{ label: metricName[o.metric], data: cats.map(c => c.amount), backgroundColor: cats.map((_, i) => pal[i % pal.length]) }];
    r.type = cats.length <= 6 && cats.length > 0 ? "doughnut" : "bar";
    r.head = [T("Categoría"), T("Monto"), T("% del total")];
    r.rows = cats.map(c => [c.category, money(c.amount), share(c.amount, total)]);
    r.hint = cats.length ? T("Total del periodo:") + " " + money(total) : T("Aún no hay movimientos en este periodo.");
    return r;
  }

  if (o.group === "kind") {
    const items = [[T("Gastos fijos"), tot.fixed], [T("Gastos variables"), tot.variable]];
    if (o.metric === "all") items.push([T("Ahorro"), Math.max(tot.savings, 0)]);
    const total = items.reduce((a, i) => a + i[1], 0);
    r.labels = items.map(i => i[0]);
    r.datasets = [{ label: T("Monto"), data: items.map(i => i[1]), backgroundColor: items.map((_, i) => pal[i % pal.length]) }];
    r.type = "doughnut";
    r.head = [T("Tipo"), T("Monto"), T("% del total")];
    r.rows = items.map(i => [i[0], money(i[1]), share(i[1], total)]);
    r.hint = T("Total del periodo:") + " " + money(total);
    return r;
  }

  // Agrupado por mes
  const defs = {
    expenses: [[T("Gastos fijos"), m => m.t.fixed], [T("Gastos variables"), m => m.t.variable]],
    income: [[T("Ingresos"), m => m.t.income]],
    savings: [[T("Ahorro"), m => m.t.savings]],
    all: [[T("Ingresos"), m => m.t.income], [T("Gastos"), m => m.t.expenses], [T("Ahorro"), m => m.t.savings]]
  }[o.metric];
  r.labels = months.map(m => m.label);
  r.datasets = defs.map(d => ({ label: d[0], data: months.map(d[1]) }));
  r.multi = defs.length > 1;
  r.stacked = o.metric === "expenses";
  r.type = months.length >= 6 ? "line" : "bar";
  r.head = [T("Mes"), ...defs.map(d => d[0])];
  r.rows = months.map(m => [m.label, ...defs.map(d => money(d[1](m)))]);
  r.hint = T("Total del periodo:") + " " + (o.metric === "all" ? T("Ahorro") + " " + money(tot.savings) : money(defs.reduce((a, d) => a + months.reduce((x, m) => x + d[1](m), 0), 0)));
  return r;
}

function renderExplorer() {
  if (!document.getElementById("explorerChart")) return;
  const o = exNormalize();
  const heat = o.view === "heatmap";
  $("exChartView").hidden = heat;
  $("exHeatView").hidden = !heat;
  if (explorerChart) { explorerChart.destroy(); explorerChart = null; }

  const built = exBuild(o);
  if (heat) renderCategoryHeatmap();

  // tabla de datos
  $("exHead").innerHTML = built.head.map(h => `<th>${h}</th>`).join("");
  $("exTable").innerHTML = built.rows.length
    ? built.rows.map(row => `<tr>${row.map((c, i) => `<td${i === 0 ? "" : ' class="num"'}>${String(c).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]))}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${built.head.length}">${T("Aún no hay movimientos en este periodo.")}</td></tr>`;
  $("exHint").textContent = heat ? T("Mapa de calor del año elegido en Filtros: más intenso = más gasto.") : built.hint;
  if (heat) return;

  let type = built.type;
  if (!built.fixedShape && o.shape !== "auto") type = o.shape;
  if (type === "doughnut" && built.multi) type = "bar";
  if (type === "doughnut" && built.datasets.length === 1 && built.stacked) type = "bar";

  const base = chartOptions();
  const options = { ...base, plugins: { ...base.plugins } };
  if (type === "doughnut") {
    options.plugins.tooltip = { callbacks: { label: c => `${c.label}: ${formatCurrency(c.raw)}` } };
  } else {
    options.scales = { x: { stacked: built.stacked && type === "bar" }, y: { beginAtZero: true, stacked: built.stacked && type === "bar" } };
    if (built.datasets.length === 1 && !built.multi) options.plugins.legend = { display: false };
    if (built.labels.length > 6 && o.group === "category" && type === "bar") options.indexAxis = "y";
    if (built.percent) {
      options.scales.y.ticks = { callback: v => v + "%" };
      options.plugins.tooltip = { callbacks: { label: c => `${c.dataset.label}: ${Number(c.raw).toFixed(1)}%` } };
    }
    if (built.pareto) {
      options.scales.y2 = { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: v => v + "%" } };
      options.plugins.tooltip = { callbacks: { label: c => c.dataset.yAxisID === "y2" ? `${c.dataset.label}: ${Number(c.raw).toFixed(1)}%` : `${c.dataset.label}: ${formatCurrency(c.raw)}` } };
    }
  }
  explorerChart = new Chart(document.getElementById("explorerChart"), { type, data: { labels: built.labels, datasets: built.datasets }, options });
}

// Funciones del plan Pro dentro del explorador: se marcan con candado y avisan al elegirlas.
function applyExplorerGates() {
  const pro = MonetraPlan.isPro();
  ["exPeriod", "exView"].forEach(id => {
    [...$(id).options].forEach(o => {
      if (!o.dataset.pro) return;
      const locked = !pro;
      if (locked && !o.dataset.lk) { o.textContent += " 🔒"; o.dataset.lk = "1"; }
      if (!locked && o.dataset.lk) { o.textContent = o.textContent.replace(" 🔒", ""); delete o.dataset.lk; }
    });
  });
}

["exMetric", "exGroup", "exPeriod", "exView", "exShape"].forEach(id => {
  const sel = $(id);
  sel.dataset.prev = sel.value;
  sel.addEventListener("change", () => {
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.pro && !MonetraPlan.isPro()) {
      sel.value = sel.dataset.prev;
      MonetraPlan.upsell(opt.dataset.pro);
      return;
    }
    sel.dataset.prev = sel.value;
    renderExplorer();
  });
});

function refreshDashboard() {
  setupYearFilterIfNeeded();
  renderCategoryOptions();
  updateSummary();
  renderMonthlyDetailTable();
  renderTransactionTable();
  renderCategoriesTable();
  renderAllProCharts();
  renderAnalytics();
}

function startEditingTransaction(id) {
  const transaction = transactionsCache.find(item => item.id === id);
  if (!transaction) return;

  editingTransactionId = id;

  dateInput.value = transaction.date;
  typeInput.value = transaction.type;
  typeInput.disabled = transaction.type === "fixed";
  renderCategoryOptions();
  categorySelect.value = transaction.categoryId;
  amountInput.value = transaction.amountOrig;
  renderCurrencySelect(txCur(transaction));
  descriptionInput.value = transaction.description || "";

  submitBtn.textContent = "Guardar cambios";
  cancelEditBtn.classList.remove("hidden");

  showSection("transactionsSection");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startEditingRecurringForMonth(parentId) {
  const parent = transactionsCache.find(item => item.id === parentId);
  if (!parent) return;

  const year = Number(yearFilter.value);
  const month = Number(monthFilter.value);
  const override = getRecurringOverride(parentId, year, month);
  const source = override || parent;

  editingTransactionId = null;
  editingMonthOverride = { parentId, year, month, overrideId: override ? override.id : null };

  dateInput.value = override ? override.date : buildMonthlyDate(parent.date, year, month);
  typeInput.value = "fixed";
  typeInput.disabled = true;
  renderCategoryOptions();
  categorySelect.value = source.categoryId;
  amountInput.value = source.amountOrig;
  renderCurrencySelect(txCur(source));
  descriptionInput.value = source.description || "";

  submitBtn.textContent = "Guardar cambio de este mes";
  cancelEditBtn.classList.remove("hidden");

  showSection("transactionsSection");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEditingTransaction() {
  editingTransactionId = null;
  editingMonthOverride = null;
  form.reset();
  dateInput.value = getCurrentDateValue();
  typeInput.disabled = false;
  submitBtn.textContent = "Agregar";
  cancelEditBtn.classList.add("hidden");
  renderCategoryOptions();
  renderCurrencySelect();
}

async function addOrUpdateTransaction(event) {
  event.preventDefault();

  if (categorySelect.value === "__new__") {
    alert(T("Escribe el nombre y pulsa «Crear categoría», o elige una existente."));
    openInlineCategory($("inlineCatName").value);
    return;
  }

  if (!categorySelect.value) {
    alert(T("Primero crea o selecciona una categoría."));
    return;
  }

  const currencyValue = $("currencySelect").value;
  const transaction = {
    date: dateInput.value,
    type: typeInput.value,
    categoryId: categorySelect.value,
    amount: Number(amountInput.value),
    currency: /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : MonetraFX.display,
    description: descriptionInput.value.trim()
  };

  if (editingMonthOverride) {
    const ctx = editingMonthOverride;
    const parent = transactionsCache.find(item => item.id === ctx.parentId);
    const sameMonth = getYear(transaction.date) === ctx.year && getMonth(transaction.date) === ctx.month;
    const payload = {
      date: sameMonth ? transaction.date : buildMonthlyDate(parent ? parent.date : transaction.date, ctx.year, ctx.month),
      type: "fixed_override",
      parentRecurringId: ctx.parentId,
      overrideYear: ctx.year,
      overrideMonth: ctx.month,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description
    };

    if (ctx.overrideId) await apiUpdateTransaction(ctx.overrideId, payload);
    else await apiCreateTransaction(payload);

    alert(T("Cambio guardado solo para este mes. Los demás meses no se modificaron."));
    await refreshData();
    cancelEditingTransaction();
    monthFilter.value = ctx.month;
    yearFilter.value = ctx.year;
    refreshDashboard();
    return;
  }

  if (editingTransactionId) {
    await apiUpdateTransaction(editingTransactionId, transaction);
    alert(T("Movimiento actualizado."));
  } else {
    await apiCreateTransaction(transaction);

    if (transaction.type === "fixed") {
      alert(T("Gasto fijo guardado como recurrente."));
    }
  }

  await refreshData();

  const selectedDate = transaction.date;
  cancelEditingTransaction();

  monthFilter.value = getMonth(selectedDate);
  yearFilter.value = getYear(selectedDate);

  refreshDashboard();
}


async function deleteRecurringOnlyThisMonth(parentRecurringId) {
  const selectedYear = Number(yearFilter.value);
  const selectedMonth = Number(monthFilter.value);
  const original = transactionsCache.find(item => item.id === parentRecurringId);

  if (!original) {
    alert(T("No se encontró la serie recurrente original."));
    return;
  }

  const existingOverride = getRecurringOverride(parentRecurringId, selectedYear, selectedMonth);
  const existingDeleted = getDeletedRecurringMarker(parentRecurringId, selectedYear, selectedMonth);

  if (existingDeleted) {
    alert(T("Este gasto recurrente ya está eliminado para este mes."));
    return;
  }

  if (existingOverride) {
    await apiDeleteTransaction(existingOverride.id);
  }

  const deletionMarker = {
    date: buildMonthlyDate(original.date, selectedYear, selectedMonth),
    type: "fixed_deleted",
    parentRecurringId,
    overrideYear: selectedYear,
    overrideMonth: selectedMonth,
    categoryId: original.categoryId,
    amount: 0,
    description: "Gasto recurrente eliminado solo para este mes"
  };

  await apiCreateTransaction(deletionMarker);
  await refreshData();
  refreshDashboard();

  alert(T("Gasto recurrente eliminado solo para este mes. Los demás meses no se modificaron."));
}

async function deleteTransaction(id) {
  const target = transactionsCache.find(item => item.id === id);
  if (target && target.type === "fixed") {
    for (const child of transactionsCache.filter(item => item.parentRecurringId === id)) {
      await apiDeleteTransaction(child.id);
    }
  }

  await apiDeleteTransaction(id);
  await refreshData();
  refreshDashboard();
}

function startEditingCategory(id) {
  const category = categoriesCache.find(item => item.id === id);
  if (!category) return;

  editingCategoryId = id;
  categoryNameInput.value = category.name;
  categoryKindInput.value = category.kind;
  categorySubmitBtn.textContent = "Guardar categoría";
  categoryCancelBtn.classList.remove("hidden");
}

function cancelEditingCategory() {
  editingCategoryId = null;
  categoryForm.reset();
  categorySubmitBtn.textContent = "Agregar categoría";
  categoryCancelBtn.classList.add("hidden");
}

async function addOrUpdateCategory(event) {
  event.preventDefault();

  const category = {
    name: categoryNameInput.value.trim(),
    kind: categoryKindInput.value
  };

  if (!category.name) {
    alert(T("Escribe un nombre para la categoría."));
    return;
  }

  try {
    if (editingCategoryId) {
      await apiUpdateCategory(editingCategoryId, category);
      alert(T("Categoría actualizada."));
    } else {
      await apiCreateCategory(category);
    }

    await refreshData();
    cancelEditingCategory();
    refreshDashboard();
  } catch (error) {
    if (error.code === "limit_categories") MonetraPlan.upsell("categories");
    else alert(T(error.message));
  }
}

async function deleteCategory(id) {
  if (!confirm(T("¿Deseas eliminar esta categoría? Solo se puede eliminar si no tiene movimientos."))) return;

  try {
    await apiDeleteCategory(id);
    await refreshData();
    refreshDashboard();
  } catch (error) {
    alert(T(error.message));
  }
}

async function exportJSON() {
  const rawTransactions = transactionsCache.map(({ amountOrig, ...t }) => ({ ...t, amount: amountOrig, currency: txCur(t) }));
  const json = JSON.stringify({ categories: categoriesCache, transactions: rawTransactions }, null, 2);
  // iPhone/Android en el navegador: menú de compartir con el archivo
  try {
    const file = new File([json], "db_export.json", { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Respaldo Monetra" });
      return;
    }
  } catch (error) {
    if (error && error.name === "AbortError") return;
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "db_export.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importJSONFile(file) {
  if (!file) return;
  if (!confirm(T("Se agregarán a la base de datos los movimientos y categorías del respaldo. No se borra nada. ¿Deseas continuar?"))) return;

  try {
    const data = JSON.parse(await file.text());
    const result = await Data.importDB(data);
    await refreshData();
    setupYearFilterIfNeeded();
    renderCategoryOptions();
    refreshDashboard();
    alert(T("Respaldo importado: " + result.transactions + " movimientos y " + result.categories + " categorías nuevas." +
      (result.skipped ? " (" + result.skipped + " movimientos omitidos por datos incompletos.)" : "")));
  } catch (error) {
    alert(T("No se pudo importar: " + (error.message || error)));
  }
}

function showSection(sectionId) {
  sections.forEach(section => section.classList.remove("active-section"));
  navButtons.forEach(button => button.classList.remove("active"));

  document.getElementById(sectionId).classList.add("active-section");
  document.querySelector(`[data-section="${sectionId}"]`).classList.add("active");

  const titles = {
    transactionsSection: "Registrar movimientos",
    categoriesSection: "Categorías",
    chartsSection: "Gráficos",
    analyticsSection: "Data analytics",
    advisorSection: "Asesor financiero IA",
    householdSection: "Hogar",
    profileSection: "Mi perfil"
  };

  pageTitle.textContent = titles[sectionId] || "Monetra";

  setTimeout(() => {
    renderAllProCharts();
    renderAnalytics();
  }, 120);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navButtons.forEach(button => {
  button.addEventListener("click", () => showSection(button.dataset.section));
});

form.addEventListener("submit", addOrUpdateTransaction);
cancelEditBtn.addEventListener("click", cancelEditingTransaction);
typeInput.addEventListener("change", renderCategoryOptions);

categoryForm.addEventListener("submit", addOrUpdateCategory);
categoryCancelBtn.addEventListener("click", cancelEditingCategory);

monthlyDetailTable.addEventListener("click", event => {
  if (event.target.matches("button[data-edit-month-id]")) {
    startEditingRecurringForMonth(event.target.dataset.editMonthId);
  }
});

transactionTable.addEventListener("click", event => {
  if (event.target.matches("button[data-edit-month-id]")) {
    startEditingRecurringForMonth(event.target.dataset.editMonthId);
    return;
  }

  if (event.target.matches("button[data-edit-transaction-id]")) {
    startEditingTransaction(event.target.dataset.editTransactionId);
    return;
  }

  if (event.target.matches("button[data-restore-month-id]")) {
    if (!confirm(T("Se quitará el cambio de este mes y volverá a mostrarse el valor original de la serie. ¿Deseas continuar?"))) return;
    deleteTransaction(event.target.dataset.restoreMonthId);
    return;
  }

  if (event.target.matches("button[data-delete-transaction-id]")) {
    const text = event.target.textContent;
    const id = event.target.dataset.deleteTransactionId;

    if (event.target.dataset.deleteMonth === "1") {
      if (!confirm(T("Este gasto recurrente se eliminará solo del mes seleccionado. Los demás meses no se modificarán. ¿Deseas continuar?"))) return;
      deleteRecurringOnlyThisMonth(id);
      return;
    }

    if (!confirm(T("¿Deseas eliminar este movimiento?"))) return;
    deleteTransaction(id);
  }
});

categoriesTable.addEventListener("click", event => {
  if (event.target.matches("button[data-edit-category-id]")) {
    startEditingCategory(event.target.dataset.editCategoryId);
  }

  if (event.target.matches("button[data-delete-category-id]")) {
    deleteCategory(event.target.dataset.deleteCategoryId);
  }
});

monthFilter.addEventListener("change", refreshDashboard);
yearFilter.addEventListener("change", refreshDashboard);
exportBtn.addEventListener("click", exportJSON);
const importBtn = $("importBtn");
const importFile = $("importFile");
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => {
  importJSONFile(importFile.files[0]);
  importFile.value = "";
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => refreshDashboard(), 250);
});

const loginOverlay = $("loginOverlay");
const loginForm = $("loginForm");
const loginMessage = $("loginMessage");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const emailRow = $("emailRow");
const passRow = $("passRow");
const forgotLink = $("forgotLink");
const googleBtn = $("googleBtn");
const orDivider = $("orDivider");
const nameRow = $("nameRow");
const authTabs = $("authTabs");
const inInstalledApp = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (inInstalledApp) $("loginBack").classList.add("hidden");
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !inInstalledApp && !loginOverlay.classList.contains("hidden")) location.href = "index.html";
});
let authMode = "login";
let recovering = location.hash.includes("type=recovery");

const AUTH_TEXT = {
  login: ["Inicia sesión para ver tus finanzas.", "Entrar"],
  signup: ["Crea tu cuenta gratis.", "Crear cuenta"],
  forgot: ["Escribe tu correo y te enviaremos un enlace.", "Enviar enlace"],
  reset: ["Escribe tu nueva contraseña.", "Guardar contraseña"]
};

function setAuthMode(mode, message) {
  authMode = mode;
  loginMessage.textContent = message || AUTH_TEXT[mode][0];
  loginBtn.textContent = AUTH_TEXT[mode][1];
  nameRow.classList.toggle("hidden", mode !== "signup");
  $("loginName").required = mode === "signup";
  emailRow.classList.toggle("hidden", mode === "reset");
  passRow.classList.toggle("hidden", mode === "forgot");
  forgotLink.classList.toggle("hidden", mode !== "login");
  googleBtn.classList.toggle("hidden", mode === "forgot" || mode === "reset");
  orDivider.classList.toggle("hidden", mode === "forgot" || mode === "reset");
  authTabs.classList.toggle("hidden", mode === "forgot" || mode === "reset");
  $("loginEmail").required = mode !== "reset";
  $("loginPassword").required = mode !== "forgot";
  $("loginPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
  authTabs.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
}

function showLogin(message, mode) {
  setAuthMode(mode || "login", message);
  loginOverlay.classList.remove("hidden");
  document.body.classList.add("locked");
}

function hideLogin() {
  loginOverlay.classList.add("hidden");
  document.body.classList.remove("locked");
}

let remoteRefreshTimer = null;
const scopeSelect = $("scopeSelect");
const householdBox = $("householdBox");
let currentHousehold = null;

async function reloadAll() {
  await refreshData();
  setupFilters();
  renderCategoryOptions();
  refreshDashboard();
}

// Muestra el selector Personal/Hogar y la sección Hogar según el estado del usuario.
async function refreshHouseholdUI() {
  currentHousehold = await Data.getHousehold();
  if (Data.getScope() !== "personal" && (!currentHousehold || currentHousehold.id !== Data.getScope())) Data.setScope("personal");

  scopeSelect.classList.toggle("hidden", !currentHousehold);
  scopeSelect.innerHTML = "";
  if (currentHousehold) {
    scopeSelect.add(new Option("Personal", "personal"));
    scopeSelect.add(new Option("Hogar: " + currentHousehold.name, currentHousehold.id));
    scopeSelect.value = Data.getScope();
  }
  renderHousehold();
}

function renderHousehold() {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  if (!currentHousehold) {
    householdBox.innerHTML = `<h3>Hogar</h3>
      <p class="muted">Comparte ingresos y gastos con otras personas (pareja, familia). Cada una usa su cuenta y todas ven los mismos datos del hogar.</p>
      <label>Nombre del hogar <input type="text" id="hhName" placeholder="Ej: Casa" /></label>
      <button type="button" id="hhCreate">Crear hogar${MonetraPlan.isPro() ? "" : MonetraPlan.lockIcon}</button>
      ${MonetraPlan.isPro() ? "" : `<p class="muted small">${T("Crear un hogar es una función Pro. Unirte con un código de invitación es gratis.")}</p>`}
      <h3 style="margin-top:22px">Unirme a un hogar</h3>
      <label>Código de invitación <input type="text" id="hhCode" autocapitalize="characters" /></label>
      <button type="button" id="hhJoin" class="secondary">Unirme</button>
      <p id="hhMsg" class="login-message"></p>`;
  } else {
    householdBox.innerHTML = `<h3>${esc(currentHousehold.name)}</h3>
      <p class="muted">Código de invitación (compártelo con quien quieras agregar):</p>
      <p><strong class="invite-code">${esc(currentHousehold.invite_code)}</strong></p>
      <p>Miembros: ${currentHousehold.members}</p>
      <p class="muted">Usa el selector Personal/Hogar de arriba para cambiar entre tus datos y los del hogar.</p>
      <button type="button" id="hhLeave" class="danger">Salir del hogar</button>
      <p id="hhMsg" class="login-message"></p>`;
  }
}

async function householdAction(fn) {
  const msg = document.getElementById("hhMsg");
  try {
    await fn();
    await refreshHouseholdUI();
    await reloadAll();
  } catch (error) {
    if (msg) msg.textContent = error.message || "Error";
  }
}

householdBox.addEventListener("click", event => {
  const id = event.target.id;
  if (id === "hhCreate" || (event.target.closest && event.target.closest("#hhCreate"))) {
    if (!MonetraPlan.isPro()) { MonetraPlan.upsell("household"); return; }
    householdAction(async () => {
      try { Data.setScope(await Data.createHousehold(document.getElementById("hhName").value, I18n.lang)); }
      catch (e) { if (e.code === "pro_required") { MonetraPlan.upsell("household"); return; } throw e; }
    });
  }
  if (id === "hhJoin") householdAction(async () => {
    Data.setScope(await Data.joinHousehold(document.getElementById("hhCode").value));
  });
  if (id === "hhLeave" && confirm(T("¿Salir del hogar? Si eres el último miembro, se borrarán sus datos."))) {
    householdAction(() => Data.leaveHousehold());
  }
});

scopeSelect.addEventListener("change", async () => {
  Data.setScope(scopeSelect.value);
  await reloadAll();
});

function scheduleRemoteRefresh() {
  clearTimeout(remoteRefreshTimer);
  remoteRefreshTimer = setTimeout(async () => {
    try {
      await refreshData();
      setupYearFilterIfNeeded();
      renderCategoryOptions();
      refreshDashboard();
    } catch (error) {
      console.error(error);
    }
  }, 400);
}

// Al cambiar de modo claro/oscuro se vuelven a dibujar los gráficos con los colores nuevos
document.addEventListener("monetra:theme", () => {
  try { if (typeof transactionsCache !== "undefined" && transactionsCache.length >= 0 && document.body && !document.body.classList.contains("locked")) { refreshDashboard(); renderAllProCharts(); renderAnalytics(); } } catch (e) { console.warn(e); }
});

// ----- Moneda elegida en el perfil -----
function renderProfileCurrency() {
  const sel = document.getElementById("profCurrency");
  if (!sel) return;
  sel.innerHTML = MonetraFX.list().map(c => `<option value="${c}">${c} · ${MonetraFX.name(c)}</option>`).join("");
  if (![...sel.options].some(o => o.value === MonetraFX.display)) sel.add(new Option(MonetraFX.display, MonetraFX.display));
  sel.value = MonetraFX.display;
  const note = $("fxNote");
  const when = MonetraFX.updatedAt ? new Date(MonetraFX.updatedAt).toLocaleString(({ es: "es-CA", en: "en-CA", fr: "fr-CA" })[I18n.lang]) : "";
  const credit = MonetraFX.source === "open.er-api.com" ? ' · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>' : MonetraFX.source ? " · " + MonetraFX.source : "";
  note.innerHTML = (when ? T("Tasas de cambio actualizadas:") + " " + when + credit : T("Aún no se pudieron obtener tasas de cambio; se mostrarán los montos sin convertir."));
}

function onCurrencyChanged() {
  applyFx();
  renderProfileCurrency();
  renderCurrencySelect();
  if (typeof refreshDashboard === "function" && !document.body.classList.contains("locked")) refreshDashboard();
  document.dispatchEvent(new CustomEvent("monetra:currency"));
}

async function changeDisplayCurrency(code) {
  MonetraFX.setDisplay(code);
  onCurrencyChanged();
  try { await Data.saveProfile({ currency: code }); } catch (error) { alert(T(error.message)); }
}

document.getElementById("profCurrency")?.addEventListener("change", event => changeDisplayCurrency(event.target.value));
MonetraFX.onUpdate(() => { if (transactionsCache.length || !document.body.classList.contains("locked")) onCurrencyChanged(); });

// Primera vez sin moneda elegida: se pregunta (con una sugerencia según el idioma/región del navegador).
function guessCurrency() {
  const region = ((navigator.language || "").split("-")[1] || "").toUpperCase();
  const map = { CA: "CAD", US: "USD", MX: "MXN", PE: "PEN", CO: "COP", CL: "CLP", AR: "ARS", BR: "BRL", UY: "UYU", BO: "BOB", PY: "PYG", DO: "DOP", CR: "CRC", GT: "GTQ", HN: "HNL", NI: "NIO", PA: "PAB", VE: "VES", GB: "GBP", ES: "EUR", FR: "EUR", DE: "EUR", IT: "EUR", PT: "EUR", BE: "EUR", NL: "EUR", CH: "CHF", JP: "JPY", CN: "CNY", IN: "INR", AU: "AUD" };
  return map[region] || "CAD";
}

function promptCurrency() {
  const options = MonetraFX.list().map(c => `<option value="${c}">${c} · ${MonetraFX.name(c)}</option>`).join("");
  MonetraPlan.show(`<h3>${T("Elige tu moneda")}</h3><p class="muted">${T("Monetra mostrará todos tus montos en esta moneda. Puedes cambiarla después en tu perfil.")}</p>
    <label>${T("Moneda")} <select id="firstCurrency">${options}</select></label>
    <div class="modal-actions"><button type="button" id="firstCurrencySave">${T("Guardar")}</button></div>`);
  const sel = document.getElementById("firstCurrency");
  sel.value = guessCurrency();
  document.getElementById("firstCurrencySave").addEventListener("click", () => { MonetraPlan.close(); changeDisplayCurrency(sel.value); });
}

// ----- Escaneo de boletas -----
const scanBtn = $("scanBtn"), scanFile = $("scanFile"), scanMsg = $("scanMsg");

function setScanMsg(text, kind) {
  scanMsg.textContent = text || "";
  scanMsg.className = "scan-msg" + (kind ? " " + kind : "") + (text ? "" : " hidden");
}

// Reduce la foto (máx. 1600 px, JPEG) para enviarla rápido y barato; no se guarda en ningún lado.
async function compressImage(file, maxSide = 1600, quality = 0.82) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
  const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
  return String(dataUrl).split(",")[1];
}

function fillFromReceipt(r) {
  const today = getCurrentDateValue();
  if (/^\d{4}-\d{2}-\d{2}$/.test(r.date || "") && r.date <= today) dateInput.value = r.date;
  typeInput.value = "variable";
  renderCategoryOptions();
  const wanted = String(r.category || "").trim();
  const match = wanted && categoriesCache.find(c => c.kind === "variable" && c.name.trim().toLowerCase() === wanted.toLowerCase());
  if (match) categorySelect.value = match.id;
  else if (wanted) {
    const pend = document.createElement("option"); pend.value = "__new__"; pend.textContent = "+ " + wanted;
    categorySelect.appendChild(pend); categorySelect.value = "__new__"; openInlineCategory(wanted);
  }

  let amount = Number(r.total);
  let note = "";
  const cur = /^[A-Z]{3}$/.test(r.currency || "") ? r.currency : MonetraFX.display;
  if (cur !== MonetraFX.display && !MonetraPlan.isPro()) {
    // Plan Gratis: una sola moneda; se convierte y se anota el monto original.
    if (MonetraFX.supported(cur) && MonetraFX.ready) {
      note = ` (${Number(r.total).toFixed(2)} ${cur})`;
      amount = Math.round(MonetraFX.convert(amount, cur, MonetraFX.display) * 100) / 100;
    }
    renderCurrencySelect();
  } else {
    renderCurrencySelect(cur);
  }
  if (Number.isFinite(amount)) amountInput.value = amount;
  descriptionInput.value = (String(r.merchant || r.description || "").trim().slice(0, 70) + note).trim();
}

scanBtn.addEventListener("click", () => {
  if (editingTransactionId || editingMonthOverride) { setScanMsg(T("Termina o cancela la edición antes de escanear una boleta."), "err"); return; }
  const info = MonetraPlan.info;
  if (info && !MonetraPlan.isPro() && info.scans_month >= (info.limits.scans_month || 3)) { MonetraPlan.upsell("scan"); return; }
  scanFile.value = "";
  scanFile.click();
});

scanFile.addEventListener("change", async () => {
  const file = scanFile.files && scanFile.files[0];
  if (!file) return;
  scanBtn.disabled = true;
  setScanMsg(T("Leyendo la boleta..."));
  try {
    const image = await compressImage(file);
    const res = await Data.scanReceipt({
      image, mediaType: "image/jpeg", lang: I18n.lang, currency: MonetraFX.display, today: getCurrentDateValue(),
      categories: categoriesCache.filter(c => c.kind === "variable").map(c => c.name).slice(0, 40)
    });
    fillFromReceipt(res);
    setScanMsg(T("Listo. Revisa los datos y pulsa Agregar para guardarlos."), "ok");
    if (window.MonetraTrack) MonetraTrack.event("scan_receipt");
    MonetraPlan.load();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    if (error.code === "free_limit") { setScanMsg("", ""); MonetraPlan.upsell("scan"); MonetraPlan.load(); }
    else setScanMsg(T(error.message || "No se pudo leer la boleta."), "err");
  } finally {
    scanBtn.disabled = false;
    scanFile.value = "";
  }
});

$("menuPlans")?.addEventListener("click", () => { $("userMenu").classList.add("hidden"); MonetraPlan.open(); });

async function enterApp() {
  try {
    loginMessage.textContent = "Cargando tus datos...";
    // Moneda, tasas y plan: si algo falla no impide entrar (se usan valores por defecto).
    const ratesReady = MonetraFX.ready ? (MonetraFX.refresh(), Promise.resolve()) : Promise.race([MonetraFX.refresh(), new Promise(r => setTimeout(r, 4000))]);
    const prof = await withTimeout(Data.getProfile(), "Perfil").catch(() => null);
    if (prof && prof.currency) MonetraFX.setDisplay(prof.currency);
    await withTimeout(MonetraPlan.load(), "Plan").catch(() => null);
    await ratesReady;
    await withTimeout(refreshHouseholdUI(), "Hogar");
    await withTimeout(refreshData(), "Datos");
    setupFilters();
    renderCategoryOptions();
    renderCurrencySelect();
    renderProfileCurrency();
    applyExplorerGates();
    refreshDashboard();
    if (prof && prof.ready && !prof.currency && transactionsCache.length === 0) promptCurrency();
    hideLogin();
    Data.subscribe(scheduleRemoteRefresh);
    if (window.MonetraCountryReady && Data.setMyCountry) window.MonetraCountryReady.then(c => { if (c) Data.setMyCountry(c); });
    document.dispatchEvent(new CustomEvent("monetra:ready"));
  } catch (error) {
    console.error(error);
    showLogin(error.message || "No se pudo conectar con la base de datos.");
  }
}

async function initApp() {
  dateInput.value = getCurrentDateValue();

  if (!Data.isConfigured()) {
    showLogin("Falta configurar la base de datos (archivo config.js).");
    loginBtn.disabled = true;
    googleBtn.disabled = true;
    return;
  }

  Data.onAuth(event => {
    if (event === "PASSWORD_RECOVERY") {
      recovering = true;
      showLogin(null, "reset");
    }
  });

  try {
    const session = await Promise.race([
      Data.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Sin conexión con la base de datos. Revisa tu internet e inténtalo de nuevo.")), 8000))
    ]);
    if (recovering) {
      showLogin(null, "reset");
    } else if (!session) {
      const params = new URLSearchParams(location.hash.slice(1) || location.search);
      showLogin(params.get("error_description"), location.hash === "#signup" ? "signup" : "login");
    } else {
      await enterApp();
    }
  } catch (error) {
    console.error(error);
    showLogin(error.message || "No se pudo iniciar la app.");
  }
}

googleBtn.addEventListener("click", async () => {
  try {
    loginMessage.textContent = "Redirigiendo a Google...";
    await Data.signInWithGoogle();
  } catch (error) {
    loginMessage.textContent = error.message || "No se pudo iniciar con Google.";
  }
});

authTabs.addEventListener("click", event => {
  if (event.target.dataset.mode) setAuthMode(event.target.dataset.mode);
});

forgotLink.addEventListener("click", event => {
  event.preventDefault();
  setAuthMode("forgot");
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("loginEmail").value;
  const password = $("loginPassword").value;
  loginBtn.disabled = true;
  loginMessage.textContent = "Entrando...";
  try {
    if (authMode === "login") {
      await withTimeout(Data.signIn(email, password), "Inicio de sesión");
      await enterApp();
    } else if (authMode === "signup") {
      const result = await Data.signUp(email, password, I18n.lang, $("loginName").value);
      if (result === "session") await enterApp();
      else { loginForm.classList.add("done"); $("signupOk").classList.remove("hidden"); loginMessage.textContent = ""; }
    } else if (authMode === "forgot") {
      await Data.resetPassword(email);
      setAuthMode("login", "Te enviamos un enlace para cambiar tu contraseña.");
    } else {
      await Data.updatePassword(password);
      recovering = false;
      history.replaceState(null, "", location.pathname);
      await enterApp();
    }
    $("loginPassword").value = "";
  } catch (error) {
    loginMessage.textContent = error.message || "No se pudo completar la acción.";
  } finally {
    loginBtn.disabled = false;
  }
});

$("signupOkBtn").addEventListener("click", () => {
  loginForm.classList.remove("done"); $("signupOk").classList.add("hidden"); $("loginPassword").value = ""; $("loginName").value = "";
  setAuthMode("login", "Ahora inicia sesión con tu correo y contraseña.");
});

logoutBtn.addEventListener("click", async () => {
  await Data.signOut();
  transactionsCache = [];
  categoriesCache = [];
  document.dispatchEvent(new CustomEvent("monetra:logout"));
  location.replace("index.html");
});

initApp();
