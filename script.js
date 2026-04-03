/* ═══════════════════════════════════════════════════
   EXPENSE TRACKER PRO — Application Logic
   ═══════════════════════════════════════════════════ */

// ──── Category Definitions ────
const CATEGORIES = {
    expense: [
        { value: 'Food',          emoji: '🍔', color: '#f97316' },
        { value: 'Transport',     emoji: '🚗', color: '#3b82f6' },
        { value: 'Shopping',      emoji: '🛍️', color: '#ec4899' },
        { value: 'Bills',         emoji: '📄', color: '#8b5cf6' },
        { value: 'Entertainment', emoji: '🎮', color: '#06b6d4' },
        { value: 'Health',        emoji: '💊', color: '#22c55e' },
        { value: 'Education',     emoji: '📚', color: '#6366f1' },
        { value: 'Other',         emoji: '📦', color: '#64748b' },
    ],
    income: [
        { value: 'Salary',     emoji: '💼', color: '#22c55e' },
        { value: 'Freelance',  emoji: '💻', color: '#06b6d4' },
        { value: 'Investment', emoji: '📈', color: '#8b5cf6' },
        { value: 'Gift',       emoji: '🎁', color: '#f97316' },
        { value: 'Other',      emoji: '💰', color: '#64748b' },
    ]
};

const CATEGORY_CHART_COLORS = [
    '#6366f1', '#22c55e', '#f97316', '#ec4899',
    '#3b82f6', '#8b5cf6', '#06b6d4', '#64748b',
    '#eab308', '#ef4444'
];

// ──── State ────
let transactions = [];
let pieChart = null;
let barChart = null;

// ──── DOM References ────
const DOM = {
    form:            document.getElementById('transactionForm'),
    description:     document.getElementById('description'),
    amount:          document.getElementById('amount'),
    type:            document.getElementById('type'),
    category:        document.getElementById('category'),
    date:            document.getElementById('date'),
    descError:       document.getElementById('descError'),
    amtError:        document.getElementById('amtError'),
    dateError:       document.getElementById('dateError'),
    balance:         document.getElementById('balance'),
    income:          document.getElementById('income'),
    expense:         document.getElementById('expense'),
    txnCount:        document.getElementById('txnCount'),
    list:            document.getElementById('transactionList'),
    listEmpty:       document.getElementById('listEmpty'),
    pieCanvas:       document.getElementById('expenseChart'),
    barCanvas:       document.getElementById('monthlyChart'),
    pieEmpty:        document.getElementById('pieEmpty'),
    barEmpty:        document.getElementById('barEmpty'),
    searchInput:     document.getElementById('searchInput'),
    filterType:      document.getElementById('filterType'),
    filterCategory:  document.getElementById('filterCategory'),
    sortOrder:       document.getElementById('sortOrder'),
    themeToggle:     document.getElementById('themeToggleBtn'),
    themeIcon:       document.getElementById('themeIcon'),
    exportCsvBtn:    document.getElementById('exportCsvBtn'),
    clearAllBtn:     document.getElementById('clearAllBtn'),
    // Edit modal
    editModal:       document.getElementById('editModal'),
    editForm:        document.getElementById('editForm'),
    editId:          document.getElementById('editId'),
    editDescription: document.getElementById('editDescription'),
    editAmount:      document.getElementById('editAmount'),
    editType:        document.getElementById('editType'),
    editCategory:    document.getElementById('editCategory'),
    editDate:        document.getElementById('editDate'),
    modalCloseBtn:   document.getElementById('modalCloseBtn'),
    toastContainer:  document.getElementById('toastContainer'),
};


// ═══════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════

/** Format amount with Indian numbering & ₹ symbol */
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

/** Get category metadata by value */
function getCategoryMeta(type, categoryValue) {
    const list = CATEGORIES[type] || CATEGORIES.expense;
    return list.find(c => c.value === categoryValue) || { emoji: '📦', color: '#64748b' };
}

/** Format date as readable string */
function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Show toast notification */
function showToast(message, type = 'success') {
    const iconMap = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i data-lucide="${iconMap[type] || 'info'}"></i><span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });
    setTimeout(() => toast.remove(), 3200);
}


// ═══════════════════════════════════════════════════
// CATEGORY DROPDOWN MANAGEMENT
// ═══════════════════════════════════════════════════

function populateCategoryDropdown(selectEl, type) {
    selectEl.innerHTML = '';
    CATEGORIES[type].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.value;
        opt.textContent = `${cat.emoji} ${cat.value}`;
        selectEl.appendChild(opt);
    });
}

function updateFilterCategories() {
    const currentVal = DOM.filterCategory.value;
    DOM.filterCategory.innerHTML = '<option value="all">All Categories</option>';
    const allCats = [...CATEGORIES.expense, ...CATEGORIES.income];
    const seen = new Set();
    allCats.forEach(cat => {
        if (!seen.has(cat.value)) {
            seen.add(cat.value);
            const opt = document.createElement('option');
            opt.value = cat.value;
            opt.textContent = `${cat.emoji} ${cat.value}`;
            DOM.filterCategory.appendChild(opt);
        }
    });
    // Restore selection if it still exists
    if ([...DOM.filterCategory.options].some(o => o.value === currentVal)) {
        DOM.filterCategory.value = currentVal;
    }
}


// ═══════════════════════════════════════════════════
// DATA PERSISTENCE (LocalStorage)
// ═══════════════════════════════════════════════════

function saveData() {
    try {
        localStorage.setItem('expenseTracker_transactions', JSON.stringify(transactions));
    } catch (e) {
        showToast('Failed to save data', 'error');
    }
}

function loadData() {
    try {
        const raw = localStorage.getItem('expenseTracker_transactions');
        if (raw) {
            transactions = JSON.parse(raw);
            // Migrate old data that might lack fields
            transactions = transactions.map(t => ({
                id: t.id || Date.now(),
                description: t.description || 'Untitled',
                amount: Number(t.amount) || 0,
                type: t.type || 'expense',
                category: t.category || 'Other',
                date: t.date || new Date().toISOString().split('T')[0],
            }));
        }
    } catch (e) {
        transactions = [];
        showToast('Could not load saved data', 'error');
    }
}


// ═══════════════════════════════════════════════════
// FORM VALIDATION
// ═══════════════════════════════════════════════════

function clearErrors() {
    DOM.descError.textContent = '';
    DOM.amtError.textContent = '';
    DOM.dateError.textContent = '';
}

function validateForm(desc, amount, date) {
    clearErrors();
    let valid = true;

    if (!desc || desc.trim().length === 0) {
        DOM.descError.textContent = 'Please enter a description';
        valid = false;
    } else if (desc.trim().length < 2) {
        DOM.descError.textContent = 'Description too short';
        valid = false;
    }

    if (isNaN(amount) || amount <= 0) {
        DOM.amtError.textContent = 'Enter a positive amount';
        valid = false;
    } else if (amount > 99999999) {
        DOM.amtError.textContent = 'Amount too large';
        valid = false;
    }

    if (!date) {
        DOM.dateError.textContent = 'Select a date';
        valid = false;
    }

    return valid;
}


// ═══════════════════════════════════════════════════
// ADD / EDIT / DELETE TRANSACTIONS
// ═══════════════════════════════════════════════════

function addTransaction(e) {
    e.preventDefault();

    const desc   = DOM.description.value.trim();
    const amount = parseFloat(DOM.amount.value);
    const type   = DOM.type.value;
    const cat    = DOM.category.value;
    const date   = DOM.date.value;

    if (!validateForm(desc, amount, date)) return;

    transactions.push({
        id: Date.now(),
        description: desc,
        amount,
        type,
        category: cat,
        date,
    });

    saveData();
    updateUI();

    // Reset form
    DOM.description.value = '';
    DOM.amount.value = '';
    DOM.description.focus();

    showToast('Transaction added!', 'success');
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateUI();
    showToast('Transaction deleted', 'info');
}

function clearAllTransactions() {
    if (transactions.length === 0) return;
    if (!confirm('Delete ALL transactions? This cannot be undone.')) return;
    transactions = [];
    saveData();
    updateUI();
    showToast('All transactions cleared', 'info');
}


// ═══════════════════════════════════════════════════
// EDIT MODAL
// ═══════════════════════════════════════════════════

function openEditModal(id) {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;

    DOM.editId.value = txn.id;
    DOM.editDescription.value = txn.description;
    DOM.editAmount.value = txn.amount;
    DOM.editType.value = txn.type;
    populateCategoryDropdown(DOM.editCategory, txn.type);
    DOM.editCategory.value = txn.category;
    DOM.editDate.value = txn.date;

    DOM.editModal.classList.add('active');

    // Re-render icons inside modal
    lucide.createIcons({ nodes: [DOM.editModal] });
}

function closeEditModal() {
    DOM.editModal.classList.remove('active');
}

function saveEdit(e) {
    e.preventDefault();

    const id     = Number(DOM.editId.value);
    const desc   = DOM.editDescription.value.trim();
    const amount = parseFloat(DOM.editAmount.value);
    const date   = DOM.editDate.value;

    if (!desc || isNaN(amount) || amount <= 0 || !date) {
        showToast('Please fill all fields correctly', 'error');
        return;
    }

    const txn = transactions.find(t => t.id === id);
    if (!txn) return;

    txn.description = desc;
    txn.amount      = amount;
    txn.type        = DOM.editType.value;
    txn.category    = DOM.editCategory.value;
    txn.date        = date;

    saveData();
    updateUI();
    closeEditModal();
    showToast('Transaction updated!', 'success');
}


// ═══════════════════════════════════════════════════
// SEARCH, FILTER, SORT
// ═══════════════════════════════════════════════════

function getFilteredTransactions() {
    let result = [...transactions];

    // Search
    const query = DOM.searchInput.value.trim().toLowerCase();
    if (query) {
        result = result.filter(t =>
            t.description.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query) ||
            t.amount.toString().includes(query)
        );
    }

    // Type filter
    const typeFilter = DOM.filterType.value;
    if (typeFilter !== 'all') {
        result = result.filter(t => t.type === typeFilter);
    }

    // Category filter
    const catFilter = DOM.filterCategory.value;
    if (catFilter !== 'all') {
        result = result.filter(t => t.category === catFilter);
    }

    // Sort
    const sort = DOM.sortOrder.value;
    switch (sort) {
        case 'newest':  result.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id); break;
        case 'oldest':  result.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id); break;
        case 'highest': result.sort((a, b) => b.amount - a.amount); break;
        case 'lowest':  result.sort((a, b) => a.amount - b.amount); break;
    }

    return result;
}


// ═══════════════════════════════════════════════════
// RENDER TRANSACTION LIST
// ═══════════════════════════════════════════════════

function renderList(filtered) {
    DOM.list.innerHTML = '';

    if (filtered.length === 0) {
        DOM.listEmpty.classList.remove('hidden');
        return;
    }
    DOM.listEmpty.classList.add('hidden');

    filtered.forEach(t => {
        const meta = getCategoryMeta(t.type, t.category);
        const li = document.createElement('li');
        li.className = 'txn-item';
        li.innerHTML = `
            <div class="txn-category-icon" style="background:${meta.color}15; color:${meta.color}">
                ${meta.emoji}
            </div>
            <div class="txn-details">
                <div class="txn-desc" title="${t.description}">${escapeHtml(t.description)}</div>
                <div class="txn-meta">${meta.emoji} ${t.category} &middot; ${formatDate(t.date)}</div>
            </div>
            <div class="txn-right">
                <span class="txn-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '−'} ${formatCurrency(t.amount)}
                </span>
                <div class="txn-actions">
                    <button class="txn-action-btn edit-btn" data-id="${t.id}" title="Edit" aria-label="Edit">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="txn-action-btn delete-btn" data-id="${t.id}" title="Delete" aria-label="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
        DOM.list.appendChild(li);
    });

    // Render icons inside list items
    lucide.createIcons({ nodes: [DOM.list] });

    // Attach event listeners with delegation
    DOM.list.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(Number(btn.dataset.id)));
    });
    DOM.list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTransaction(Number(btn.dataset.id)));
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


// ═══════════════════════════════════════════════════
// COMPUTE SUMMARIES
// ═══════════════════════════════════════════════════

function computeSummary() {
    let income = 0, expense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
        if (t.type === 'income') {
            income += t.amount;
        } else {
            expense += t.amount;
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
    });

    return {
        balance: income - expense,
        income,
        expense,
        count: transactions.length,
        categoryTotals,
    };
}


// ═══════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════

function updatePieChart(categoryTotals) {
    const labels = Object.keys(categoryTotals);
    const data   = Object.values(categoryTotals);

    if (labels.length === 0) {
        DOM.pieEmpty.classList.remove('hidden');
        DOM.pieCanvas.style.display = 'none';
        if (pieChart) { pieChart.destroy(); pieChart = null; }
        return;
    }

    DOM.pieEmpty.classList.add('hidden');
    DOM.pieCanvas.style.display = 'block';

    const colors = labels.map((_, i) => CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length]);

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(DOM.pieCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { family: 'Inter', size: 12 },
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim(),
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`
                    }
                }
            }
        }
    });
}

function updateBarChart() {
    const monthlyData = {};

    transactions.forEach(t => {
        const d = new Date(t.date + 'T00:00:00');
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
        monthlyData[key][t.type] += t.amount;
    });

    const sortedKeys = Object.keys(monthlyData).sort();

    if (sortedKeys.length === 0) {
        DOM.barEmpty.classList.remove('hidden');
        DOM.barCanvas.style.display = 'none';
        if (barChart) { barChart.destroy(); barChart = null; }
        return;
    }

    DOM.barEmpty.classList.add('hidden');
    DOM.barCanvas.style.display = 'block';

    const labels = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    if (barChart) barChart.destroy();

    barChart = new Chart(DOM.barCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: sortedKeys.map(k => monthlyData[k].income),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Expense',
                    data: sortedKeys.map(k => monthlyData[k].expense),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderRadius: 6,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter', size: 11 },
                        color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim(),
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: {
                        font: { family: 'Inter', size: 11 },
                        color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim(),
                        callback: v => formatCurrency(v),
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { family: 'Inter', size: 12 },
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim(),
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                    }
                }
            }
        }
    });
}


// ═══════════════════════════════════════════════════
// MASTER UI UPDATE
// ═══════════════════════════════════════════════════

function updateUI() {
    const summary  = computeSummary();
    const filtered = getFilteredTransactions();

    // Summary cards (animate number changes)
    DOM.balance.textContent  = formatCurrency(summary.balance);
    DOM.income.textContent   = formatCurrency(summary.income);
    DOM.expense.textContent  = formatCurrency(summary.expense);
    DOM.txnCount.textContent = summary.count;

    // Apply color to balance based on value
    DOM.balance.parentElement.closest('.summary-card')
        ?.querySelector('.summary-value')
        ?.style.setProperty('color',
            summary.balance >= 0 ? 'var(--accent)' : 'var(--danger)');

    // List
    renderList(filtered);

    // Charts
    updatePieChart(summary.categoryTotals);
    updateBarChart();

    // Update filter categories
    updateFilterCategories();
}


// ═══════════════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════════════

function initTheme() {
    const saved = localStorage.getItem('expenseTracker_theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcon();
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('expenseTracker_theme', isDark ? 'dark' : 'light');
    updateThemeIcon();

    // Re-render charts with updated colors
    const summary = computeSummary();
    updatePieChart(summary.categoryTotals);
    updateBarChart();
}

function updateThemeIcon() {
    const isDark = document.body.classList.contains('dark-mode');
    DOM.themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons({ nodes: [DOM.themeToggle] });
}


// ═══════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════

function exportCSV() {
    if (transactions.length === 0) {
        showToast('No transactions to export', 'error');
        return;
    }

    const header = 'Date,Description,Type,Category,Amount\n';
    const rows = transactions
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(t => `${t.date},"${t.description}",${t.type},${t.category},${t.amount}`)
        .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `expense-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('CSV exported successfully!', 'success');
}


// ═══════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════

function initEventListeners() {
    // Form submission
    DOM.form.addEventListener('submit', addTransaction);

    // Type change → update category dropdown
    DOM.type.addEventListener('change', () => {
        populateCategoryDropdown(DOM.category, DOM.type.value);
    });

    // Edit modal type change
    DOM.editType.addEventListener('change', () => {
        populateCategoryDropdown(DOM.editCategory, DOM.editType.value);
    });

    // Search & filter (debounced)
    let searchTimeout;
    DOM.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => updateUI(), 200);
    });

    DOM.filterType.addEventListener('change', updateUI);
    DOM.filterCategory.addEventListener('change', updateUI);
    DOM.sortOrder.addEventListener('change', updateUI);

    // Theme
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // Export
    DOM.exportCsvBtn.addEventListener('click', exportCSV);

    // Clear all
    DOM.clearAllBtn.addEventListener('click', clearAllTransactions);

    // Edit modal
    DOM.editForm.addEventListener('submit', saveEdit);
    DOM.modalCloseBtn.addEventListener('click', closeEditModal);
    DOM.editModal.addEventListener('click', (e) => {
        if (e.target === DOM.editModal) closeEditModal();
    });

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeEditModal();
    });
}


// ═══════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════

function init() {
    // Set today's date as default
    DOM.date.valueAsDate = new Date();

    // Populate category dropdown
    populateCategoryDropdown(DOM.category, DOM.type.value);

    // Load theme
    initTheme();

    // Load data
    loadData();

    // Bind events
    initEventListeners();

    // Render
    updateUI();

    // Initialize Lucide icons
    lucide.createIcons();
}

// Boot
init();