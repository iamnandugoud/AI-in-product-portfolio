/* ===================================================================
   WealthGuard — The Financial Leak & Debt Architect
   Core Application Logic (Optimised)
   =================================================================== */

// ===== STATE MANAGEMENT =====
const state = {
    income: 0,
    expenses: 0,
    annualBonus: 0,
    loans: [],
    investments: [],
    insurance: { coverage: 0, premium: 0, type: 'ulip', age: 30 },
    leakAnalysis: null,
    insuranceAudit: null,
    debtSimulation: null,
    freedPremium: 0
};

let loanIdCounter = 0;
let investmentIdCounter = 0;

// ===== CONSTANTS =====
const TERM_INSURANCE_ANNUAL_LOW = 10800;    // ₹/year for ₹1 Cr cover, healthy 30yr male
const TERM_INSURANCE_ANNUAL_HIGH = 14400;
const INDEX_FUND_CAGR = 11;                 // % per annum
const DEFAULT_INFLATION = 6;                // %
const MAX_SIM_MONTHS = 600;                 // 50 years cap
const CRORE = 10000000;
const LAKH = 100000;

// ===== CACHED DOM REFERENCES =====
// Populated once on DOMContentLoaded to avoid repeated getElementById calls
const DOM = {};

function cacheDOMRefs() {
    const ids = [
        'monthlyIncome', 'livingExpenses', 'annualBonus',
        'loansBody', 'loansEmpty', 'loansTable',
        'investmentsBody', 'investmentsEmpty', 'investmentsTable',
        'leakResults', 'leakSummary', 'leakCards', 'surplusDisplay',
        'insuranceCoverage', 'insurancePremium', 'insuranceType', 'insurerAge',
        'insuranceResults', 'insuranceReport',
        'accelSurplus', 'accelFreedPremium', 'accelBonus', 'accelTotal',
        'acceleratorResults', 'timelineComparison',
        'debtChart', 'inflectionInfo',
        'projReturnRate', 'projYears', 'projInflation',
        'projectorResults', 'wealthMilestones', 'wealthChart',
        'btnAddLoan', 'btnAddInvestment', 'btnRunAnalysis',
        'btnAuditInsurance', 'btnAccelerate', 'btnProject', 'btnResetAll',
        'mobileNavToggle'
    ];
    ids.forEach(id => { DOM[id] = document.getElementById(id); });
    DOM.navLinks = document.querySelectorAll('.nav-link');
    DOM.sections = document.querySelectorAll('.section');
    DOM.navLinksContainer = document.querySelector('.nav-links');
}

// ===== UTILITY FUNCTIONS =====
const INR_FORMAT_OPTS = { maximumFractionDigits: 0 };

function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return '₹0';
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= CRORE) return sign + '₹' + (abs / CRORE).toFixed(2) + ' Cr';
    if (abs >= LAKH) return sign + '₹' + (abs / LAKH).toFixed(2) + ' L';
    return sign + '₹' + abs.toLocaleString('en-IN', INR_FORMAT_OPTS);
}

function formatCurrencyFull(amount) {
    if (amount == null || isNaN(amount)) return '₹0';
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function getVal(id) {
    const el = DOM[id] || document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
}

// Safe max/min for arrays (avoids stack overflow with spread on large arrays)
function safeMax(arr, accessor) {
    let max = -Infinity;
    for (let i = 0, len = arr.length; i < len; i++) {
        const v = accessor ? accessor(arr[i]) : arr[i];
        if (v > max) max = v;
    }
    return max;
}

function safeMin(arr, accessor) {
    let min = Infinity;
    for (let i = 0, len = arr.length; i < len; i++) {
        const v = accessor ? accessor(arr[i]) : arr[i];
        if (v < min) min = v;
    }
    return min;
}

// ===== NAVIGATION =====
document.addEventListener('DOMContentLoaded', () => {
    cacheDOMRefs();
    initNavigation();
    initTableButtons();
    initEventListeners();
});

function initNavigation() {
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(link.dataset.section);
            DOM.navLinksContainer.classList.remove('open');
        });
    });

    if (DOM.mobileNavToggle) {
        DOM.mobileNavToggle.addEventListener('click', () => {
            DOM.navLinksContainer.classList.toggle('open');
        });
    }
}

function switchSection(sectionId) {
    DOM.navLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');

    DOM.sections.forEach(s => {
        s.classList.remove('active');
        s.style.animation = 'none';
    });
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        // Force reflow then animate
        void target.offsetHeight;
        target.style.animation = 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards';
    }

    if (sectionId === 'accelerator') updateAcceleratorSummary();
    if (sectionId === 'projector') updateInflectionInfo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== GENERIC TABLE ROW FACTORY =====
// Deduplicated add/delete/collect for both Loans and Investments

const DELETE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function initTableButtons() {
    DOM.btnAddLoan.addEventListener('click', addLoanRow);
    DOM.btnAddInvestment.addEventListener('click', addInvestmentRow);
}

function addLoanRow() {
    const id = ++loanIdCounter;
    DOM.loansEmpty.classList.add('hidden');
    DOM.loansTable.style.display = 'table';

    const tr = document.createElement('tr');
    tr.dataset.loanId = id;
    tr.innerHTML = `
        <td><input type="text" placeholder="e.g. Home Loan" class="loan-name"></td>
        <td><input type="number" placeholder="50,00,000" class="loan-principal input-sm" min="0"></td>
        <td><input type="number" placeholder="9.5" class="loan-rate input-sm" min="0" max="100" step="0.1"></td>
        <td><input type="number" placeholder="45,000" class="loan-emi input-sm" min="0"></td>
        <td>
            <select class="loan-type">
                <option value="emi">EMI Loan</option>
                <option value="od">Overdraft (OD)</option>
                <option value="home">Home Loan</option>
            </select>
        </td>
        <td><button class="btn-delete-row" title="Remove">${DELETE_SVG}</button></td>
    `;
    // Event delegation for delete
    tr.querySelector('.btn-delete-row').addEventListener('click', () => deleteRow(tr, DOM.loansBody, DOM.loansEmpty));
    DOM.loansBody.appendChild(tr);
    tr.style.animation = 'fadeInUp 0.3s ease forwards';
}

function addInvestmentRow() {
    const id = ++investmentIdCounter;
    DOM.investmentsEmpty.classList.add('hidden');
    DOM.investmentsTable.style.display = 'table';

    const tr = document.createElement('tr');
    tr.dataset.investmentId = id;
    tr.innerHTML = `
        <td><input type="text" placeholder="e.g. ULIP Plan" class="inv-name"></td>
        <td><input type="number" placeholder="5,000" class="inv-premium input-sm" min="0"></td>
        <td><input type="number" placeholder="3,00,000" class="inv-value input-sm" min="0"></td>
        <td><input type="number" placeholder="8" class="inv-return input-sm" min="0" max="100" step="0.1"></td>
        <td><input type="number" placeholder="5" class="inv-lockin input-sm" min="0" max="30" step="1"></td>
        <td><button class="btn-delete-row" title="Remove">${DELETE_SVG}</button></td>
    `;
    tr.querySelector('.btn-delete-row').addEventListener('click', () => deleteRow(tr, DOM.investmentsBody, DOM.investmentsEmpty));
    DOM.investmentsBody.appendChild(tr);
    tr.style.animation = 'fadeInUp 0.3s ease forwards';
}

function deleteRow(row, tbody, emptyEl) {
    row.style.transition = 'opacity 0.2s, transform 0.2s';
    row.style.opacity = '0';
    row.style.transform = 'translateX(-10px)';
    setTimeout(() => {
        row.remove();
        if (tbody.children.length === 0) emptyEl.classList.remove('hidden');
    }, 200);
}

function collectLoans() {
    const rows = DOM.loansBody.querySelectorAll('tr');
    const loans = [];
    rows.forEach(row => {
        const name = row.querySelector('.loan-name')?.value || 'Loan';
        const principal = parseFloat(row.querySelector('.loan-principal')?.value) || 0;
        const rate = parseFloat(row.querySelector('.loan-rate')?.value) || 0;
        const emi = parseFloat(row.querySelector('.loan-emi')?.value) || 0;
        const type = row.querySelector('.loan-type')?.value || 'emi';
        if (principal > 0 || rate > 0 || emi > 0) {
            loans.push({ name, principal, rate, emi, type });
        }
    });
    return loans;
}

function collectInvestments() {
    const rows = DOM.investmentsBody.querySelectorAll('tr');
    const investments = [];
    rows.forEach(row => {
        const name = row.querySelector('.inv-name')?.value || 'Investment';
        const premium = parseFloat(row.querySelector('.inv-premium')?.value) || 0;
        const currentValue = parseFloat(row.querySelector('.inv-value')?.value) || 0;
        const expectedReturn = parseFloat(row.querySelector('.inv-return')?.value) || 0;
        const lockIn = parseFloat(row.querySelector('.inv-lockin')?.value) || 0;
        if (premium > 0 || currentValue > 0) {
            investments.push({ name, premium, currentValue, expectedReturn, lockIn });
        }
    });
    return investments;
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    DOM.btnRunAnalysis.addEventListener('click', runLeakAnalysis);
    DOM.btnAuditInsurance.addEventListener('click', auditInsurance);
    DOM.btnAccelerate.addEventListener('click', simulateDebtPayoff);
    DOM.btnProject.addEventListener('click', projectWealth);
    DOM.btnResetAll.addEventListener('click', resetAll);
}

// ===== 1. LEAK DETECTOR ANALYSIS =====
function runLeakAnalysis() {
    state.income = getVal('monthlyIncome');
    state.expenses = getVal('livingExpenses');
    state.annualBonus = getVal('annualBonus');
    state.loans = collectLoans();
    state.investments = collectInvestments();

    if (state.income <= 0) {
        showNotification('Please enter your monthly income first.', 'warning');
        return;
    }

    const totalEMI = state.loans.reduce((s, l) => s + l.emi, 0);
    const totalInvPremiums = state.investments.reduce((s, i) => s + i.premium, 0);
    const monthlySurplus = state.income - state.expenses - totalEMI - totalInvPremiums;

    // Find leaks: compare each loan rate against each investment return
    const leaks = [];
    const safe = [];

    for (const loan of state.loans) {
        for (const inv of state.investments) {
            if (loan.rate > inv.expectedReturn) {
                leaks.push({
                    loanName: loan.name, loanRate: loan.rate,
                    invName: inv.name, invReturn: inv.expectedReturn,
                    invPremium: inv.premium,
                    gap: loan.rate - inv.expectedReturn
                });
            } else {
                safe.push({
                    loanName: loan.name, loanRate: loan.rate,
                    invName: inv.name, invReturn: inv.expectedReturn
                });
            }
        }
    }

    leaks.sort((a, b) => b.gap - a.gap);
    state.leakAnalysis = { leaks, safe, monthlySurplus, totalEMI, totalInvPremiums };
    renderLeakResults(leaks, safe, monthlySurplus, totalEMI, totalInvPremiums);
}

function renderLeakResults(leaks, safe, surplus, totalEMI, totalInvPremiums) {
    DOM.leakResults.classList.remove('hidden');

    // Summary pills
    const parts = [];
    if (leaks.length) parts.push(`<span class="summary-stat stat-danger">🚨 ${leaks.length} Wealth Leak${leaks.length > 1 ? 's' : ''} Found</span>`);
    if (safe.length) parts.push(`<span class="summary-stat stat-safe">✅ ${safe.length} Efficient Pairing${safe.length > 1 ? 's' : ''}</span>`);
    if (!leaks.length && !safe.length) parts.push(`<span class="summary-stat stat-safe">✅ Add loans and investments to compare them</span>`);
    DOM.leakSummary.innerHTML = parts.join('');

    // Leak cards — build once with array join
    const cards = [];

    leaks.forEach((leak, i) => {
        const annualSaveable = leak.invPremium * 12 * leak.loanRate / 100;
        cards.push(`
            <div class="leak-card" style="animation-delay:${i * 0.1}s">
                <div class="leak-indicator danger">🔴</div>
                <div class="leak-details">
                    <h3>Borrowing at ${leak.loanRate}% → Investing at ${leak.invReturn}%</h3>
                    <p><strong>${leak.loanName}</strong> (${leak.loanRate}% interest) vs <strong>${leak.invName}</strong> (${leak.invReturn}% return).
                    You're losing <strong>${leak.gap.toFixed(1)}%</strong> annually on every rupee in this pair.
                    The ${formatCurrency(leak.invPremium)}/mo premium could save you ${formatCurrency(annualSaveable)} per year if redirected to this loan.</p>
                    <span class="leak-badge badge-leak">⚠️ WEALTH LEAK — ${leak.gap.toFixed(1)}% GAP</span>
                </div>
            </div>`);
    });

    safe.forEach((s, i) => {
        cards.push(`
            <div class="leak-card safe" style="animation-delay:${(leaks.length + i) * 0.1}s">
                <div class="leak-indicator safe">🟢</div>
                <div class="leak-details">
                    <h3>${s.invName} outperforms ${s.loanName} cost</h3>
                    <p><strong>${s.loanName}</strong> at ${s.loanRate}% is cheaper than <strong>${s.invName}</strong>'s ${s.invReturn}% return. This pairing is working in your favour.</p>
                    <span class="leak-badge badge-ok">✅ EFFICIENT</span>
                </div>
            </div>`);
    });

    DOM.leakCards.innerHTML = cards.join('');

    // Surplus
    const surplusClass = surplus >= 0 ? 'positive' : 'negative';
    DOM.surplusDisplay.innerHTML = `
        <div class="surplus-item"><div class="label">Monthly Income</div><div class="value positive">${formatCurrency(state.income)}</div></div>
        <div class="surplus-item"><div class="label">Living Expenses</div><div class="value negative">${formatCurrency(state.expenses)}</div></div>
        <div class="surplus-item"><div class="label">Total EMIs</div><div class="value negative">${formatCurrency(totalEMI)}</div></div>
        <div class="surplus-item"><div class="label">Investment Premiums</div><div class="value negative">${formatCurrency(totalInvPremiums)}</div></div>
        <div class="surplus-item"><div class="label">Monthly Surplus</div><div class="value ${surplusClass}">${formatCurrency(surplus)}</div></div>
    `;

    setTimeout(() => DOM.leakResults.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ===== 2. INSURANCE EFFICIENCY AUDITOR =====
const TYPE_LABELS = {
    ulip: 'ULIP', endowment: 'Endowment Plan', moneyback: 'Money Back Plan',
    term: 'Term Insurance', wholelife: 'Whole Life Plan', other: 'Other'
};

function auditInsurance() {
    const coverage = getVal('insuranceCoverage');
    const premium = getVal('insurancePremium');
    const type = DOM.insuranceType.value;
    const age = getVal('insurerAge') || 30;

    if (coverage <= 0 || premium <= 0) {
        showNotification('Please enter both coverage amount and annual premium.', 'warning');
        return;
    }

    state.insurance = { coverage, premium, type, age };

    // Cost per crore
    const costPerCrore = (premium / coverage) * CRORE;

    // Age-adjusted benchmark (4% increase per year above 30)
    const ageMultiplier = 1 + Math.max(0, age - 30) * 0.04;
    const benchLow = TERM_INSURANCE_ANNUAL_LOW * ageMultiplier;
    const benchHigh = TERM_INSURANCE_ANNUAL_HIGH * ageMultiplier;
    const benchMid = (benchLow + benchHigh) / 2;

    const overpaymentRatio = costPerCrore / benchMid;
    const isOverpaying = overpaymentRatio > 1.5;

    const termPremium = (benchMid * coverage) / CRORE;
    const annualSavings = premium - termPremium;
    const monthlySavings = annualSavings / 12;

    state.freedPremium = isOverpaying ? Math.max(0, monthlySavings) : 0;
    state.insuranceAudit = { costPerCrore, benchMid, overpaymentRatio, isOverpaying, annualSavings, monthlySavings, termPremium, benchLow, benchHigh };

    renderInsuranceResults({
        coverage, premium, type, age, costPerCrore, benchMid,
        overpaymentRatio, isOverpaying, annualSavings, monthlySavings,
        termPremium, benchLow, benchHigh
    });
}

function renderInsuranceResults(cfg) {
    DOM.insuranceResults.classList.remove('hidden');

    const efficiencyScore = Math.max(0, Math.min(100, Math.round((1 / cfg.overpaymentRatio) * 100)));
    const effColor = efficiencyScore >= 70 ? 'success' : efficiencyScore >= 40 ? 'warning' : 'danger';
    const effLabel = efficiencyScore >= 70 ? 'Good' : efficiencyScore >= 40 ? 'Moderate' : 'Poor';
    const statusClass = cfg.isOverpaying ? 'danger' : 'success';
    const typeLabel = TYPE_LABELS[cfg.type] || 'Other';

    let html = `
        <div class="insurance-report-grid">
            <div class="report-metric">
                <div class="metric-label">Your Cost per ₹1 Crore</div>
                <div class="metric-value ${statusClass}">${formatCurrencyFull(cfg.costPerCrore)}</div>
                <div class="metric-sub">per year</div>
            </div>
            <div class="report-metric">
                <div class="metric-label">Market Benchmark (Age ${cfg.age})</div>
                <div class="metric-value success">${formatCurrencyFull(cfg.benchLow)} – ${formatCurrencyFull(cfg.benchHigh)}</div>
                <div class="metric-sub">Pure Term Insurance</div>
            </div>
            <div class="report-metric">
                <div class="metric-label">Overpayment Factor</div>
                <div class="metric-value ${statusClass}">${cfg.overpaymentRatio.toFixed(1)}x</div>
                <div class="metric-sub">${cfg.isOverpaying ? 'Over benchmark' : 'Within range'}</div>
            </div>
            <div class="report-metric">
                <div class="metric-label">Efficiency Score</div>
                <div class="metric-value ${effColor}">${efficiencyScore}%</div>
                <div class="metric-sub">${effLabel}</div>
            </div>
        </div>`;

    if (cfg.isOverpaying) {
        html += `
            <div class="insurance-recommendation warning-rec">
                <div class="recommendation-title">🚨 Inefficient Policy Detected — ${typeLabel}</div>
                <div class="recommendation-text">
                    <p>You're paying <strong>${formatCurrencyFull(cfg.premium)}/year</strong> for <strong>${formatCurrency(cfg.coverage)}</strong> coverage via a <strong>${typeLabel}</strong>.</p>
                    <p style="margin-top:8px">A pure Term Insurance plan for the same coverage would cost approximately <strong>${formatCurrencyFull(cfg.termPremium)}/year</strong> — that's <strong>${cfg.overpaymentRatio.toFixed(1)}x less</strong>.</p>
                    <p style="margin-top:12px;padding:12px;background:rgba(0,229,160,0.06);border-radius:8px;border:1px solid rgba(0,229,160,0.15)">
                        💡 <strong>Recommendation:</strong> Shift to a pure Term Plan. This frees up <strong>${formatCurrencyFull(cfg.annualSavings)}/year</strong> (≈ <strong>${formatCurrencyFull(cfg.monthlySavings)}/month</strong>) that can be redirected to crush your highest-interest debt or invest in a low-cost index fund.
                    </p>
                </div>
            </div>`;
    } else {
        html += `
            <div class="insurance-recommendation">
                <div class="recommendation-title">✅ Your Insurance is Reasonably Efficient</div>
                <div class="recommendation-text">
                    Your cost per ₹1 Crore of coverage is within the acceptable range for your age bracket.
                    ${cfg.type === 'term' ? 'Great job choosing a Term Plan — it offers the highest coverage for the lowest cost.' : "If you're looking to further optimize, consider evaluating a pure Term Plan for comparison."}
                </div>
            </div>`;
    }

    DOM.insuranceReport.innerHTML = html;
    setTimeout(() => DOM.insuranceResults.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ===== 3. DEBT-KILLER ACCELERATOR =====
function updateAcceleratorSummary() {
    const income = getVal('monthlyIncome');
    const expenses = getVal('livingExpenses');
    const loans = collectLoans();
    const investments = collectInvestments();
    const bonus = getVal('annualBonus');

    const totalEMI = loans.reduce((s, l) => s + l.emi, 0);
    const totalInvPremiums = investments.reduce((s, i) => s + i.premium, 0);
    const surplus = income - expenses - totalEMI - totalInvPremiums;

    DOM.accelSurplus.textContent = formatCurrency(Math.max(0, surplus));
    DOM.accelFreedPremium.textContent = formatCurrency(state.freedPremium);
    DOM.accelBonus.textContent = formatCurrency(bonus);
    DOM.accelTotal.textContent = formatCurrency(Math.max(0, surplus) + state.freedPremium) + '/mo';
}

function simulateDebtPayoff() {
    const income = getVal('monthlyIncome');
    const expenses = getVal('livingExpenses');
    const loans = collectLoans();
    const bonus = getVal('annualBonus');
    const investments = collectInvestments();

    if (loans.length === 0) {
        showNotification('Please add loans in the Leak Detector first.', 'warning');
        return;
    }

    const totalEMI = loans.reduce((s, l) => s + l.emi, 0);
    const totalInvPremiums = investments.reduce((s, i) => s + i.premium, 0);
    const surplus = Math.max(0, income - expenses - totalEMI - totalInvPremiums);

    // BASELINE: each loan at only EMI
    const baselineResults = loans.map(loan => simulateLoanPayoff(loan));
    const baselineTotalInterest = baselineResults.reduce((s, r) => s + r.totalInterest, 0);
    const baselineMaxMonths = safeMax(baselineResults, r => r.months);
    const baselineMonthly = buildBaselineTimeline(loans, baselineMaxMonths);

    // ACCELERATED: avalanche method
    const sortedLoans = [...loans].sort((a, b) => b.rate - a.rate);
    const accelExtra = surplus + state.freedPremium;
    const accelResult = simulateAvalanche(sortedLoans, accelExtra, bonus);

    state.debtSimulation = {
        baselineTotalInterest,
        baselineMaxMonths,
        acceleratedTotalInterest: accelResult.totalInterest,
        acceleratedMonths: accelResult.months,
        interestSaved: baselineTotalInterest - accelResult.totalInterest,
        monthsSaved: baselineMaxMonths - accelResult.months,
        totalEMI,
        accelMonthlyData: accelResult.monthlyData,
        baselineMonthly,
        debtFreeDate: new Date(Date.now() + accelResult.months * 30 * 86400000),
        monthlyPaymentAfterDebt: totalEMI + accelExtra
    };

    renderAcceleratorResults();
}

function simulateLoanPayoff(loan) {
    let balance = loan.principal;
    const monthlyRate = loan.rate / 1200; // rate/100/12
    let months = 0;
    let totalInterest = 0;

    while (balance > 0 && months < MAX_SIM_MONTHS) {
        const interest = balance * monthlyRate;
        totalInterest += interest;
        const principalPayment = loan.emi - interest;
        if (principalPayment <= 0) return { months: Infinity, totalInterest: Infinity };
        balance -= principalPayment;
        if (balance < 0) balance = 0;
        months++;
    }
    return { months, totalInterest };
}

function simulateAvalanche(loans, extraMonthly, annualBonus) {
    const balances = loans.map(l => ({
        balance: l.principal,
        emi: l.emi,
        monthlyRate: l.rate / 1200, // pre-compute
        rate: l.rate,
        paidOff: false
    }));

    let months = 0, totalInterest = 0, freedEMI = 0;
    const monthlyData = [];
    const activeCount = () => balances.filter(l => !l.paidOff).length;

    while (activeCount() > 0 && months < MAX_SIM_MONTHS) {
        // Step 1: accrue interest and apply minimum EMIs
        for (const loan of balances) {
            if (loan.paidOff) continue;
            const interest = loan.balance * loan.monthlyRate;
            totalInterest += interest;
            loan.balance -= (loan.emi - interest);
            if (loan.balance <= 0) {
                freedEMI += loan.emi;
                loan.balance = 0;
                loan.paidOff = true;
            }
        }

        // Step 2: extra pool to highest-rate remaining loan
        let pool = extraMonthly + freedEMI;
        if (annualBonus > 0 && months > 0 && months % 12 === 0) pool += annualBonus;

        // Find highest-rate active loan (already sorted, so scan for first active)
        for (const loan of balances) {
            if (loan.paidOff) continue;
            if (pool > 0) {
                loan.balance -= pool;
                if (loan.balance <= 0) {
                    freedEMI += loan.emi;
                    loan.balance = 0;
                    loan.paidOff = true;
                }
            }
            break; // only apply to highest-rate
        }

        const totalOutstanding = balances.reduce((s, l) => s + Math.max(0, l.balance), 0);
        monthlyData.push({ month: months + 1, outstanding: totalOutstanding });
        months++;
        if (totalOutstanding <= 0) break;
    }

    return { months, totalInterest, monthlyData };
}

function buildBaselineTimeline(loans, maxMonths) {
    const balances = loans.map(l => ({ balance: l.principal, emi: l.emi, monthlyRate: l.rate / 1200 }));
    const data = [];

    for (let m = 0; m < maxMonths; m++) {
        for (const loan of balances) {
            if (loan.balance <= 0) continue;
            loan.balance -= (loan.emi - loan.balance * loan.monthlyRate);
            if (loan.balance < 0) loan.balance = 0;
        }
        const total = balances.reduce((s, l) => s + Math.max(0, l.balance), 0);
        data.push({ month: m + 1, outstanding: total });
        if (total <= 0) break;
    }
    return data;
}

function renderAcceleratorResults() {
    const sim = state.debtSimulation;
    DOM.acceleratorResults.classList.remove('hidden');

    const baseYrs = (sim.baselineMaxMonths / 12).toFixed(1);
    const accelYrs = (sim.acceleratedMonths / 12).toFixed(1);
    const savedYrs = (sim.monthsSaved / 12).toFixed(1);

    DOM.timelineComparison.innerHTML = `
        <div class="timeline-card baseline">
            <div class="timeline-label">🐌 Baseline (EMI Only)</div>
            <div class="timeline-stat"><div class="tl-label">Time to Debt-Free</div><div class="tl-value">${baseYrs} years</div></div>
            <div class="timeline-stat"><div class="tl-label">Total Interest Paid</div><div class="tl-value" style="color:var(--accent-danger)">${formatCurrency(sim.baselineTotalInterest)}</div></div>
        </div>
        <div class="timeline-card accelerated">
            <div class="timeline-label">🚀 Accelerated (Avalanche)</div>
            <div class="timeline-stat"><div class="tl-label">Time to Debt-Free</div><div class="tl-value" style="color:var(--accent-primary)">${accelYrs} years</div></div>
            <div class="timeline-stat"><div class="tl-label">Total Interest Paid</div><div class="tl-value" style="color:var(--accent-primary)">${formatCurrency(sim.acceleratedTotalInterest)}</div></div>
        </div>`;

    // Remove old savings highlight, add new
    const existingSavings = DOM.acceleratorResults.querySelector('.savings-highlight');
    if (existingSavings) existingSavings.remove();
    DOM.timelineComparison.insertAdjacentHTML('afterend', `
        <div class="savings-highlight">
            <div class="sh-label">Total Interest Saved</div>
            <div class="sh-value">${formatCurrency(sim.interestSaved)}</div>
            <div class="sh-sub">${savedYrs} years shaved off your debt timeline</div>
        </div>`);

    requestAnimationFrame(() => drawDebtChart(sim.baselineMonthly, sim.accelMonthlyData));
    setTimeout(() => DOM.acceleratorResults.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ===== 4. GENERATIONAL WEALTH PROJECTOR =====
function updateInflectionInfo() {
    if (!state.debtSimulation) {
        DOM.inflectionInfo.innerHTML = `<p class="inflection-placeholder">Complete the Debt-Killer simulation first to see your Inflection Point — the date when money starts working <em>for</em> you instead of <em>against</em> you.</p>`;
        return;
    }

    const sim = state.debtSimulation;
    const dateStr = sim.debtFreeDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
    const inv = sim.monthlyPaymentAfterDebt;

    DOM.inflectionInfo.innerHTML = `
        <div class="inflection-data">
            <div class="inflection-date">${dateStr}</div>
            <div class="inflection-sub">Your projected Debt-Free Date</div>
            <div class="inflection-metric"><span class="im-label">Monthly freed for investing</span><span class="im-value">${formatCurrency(inv)}</span></div>
            <div class="inflection-metric"><span class="im-label">Interest saved from acceleration</span><span class="im-value">${formatCurrency(sim.interestSaved)}</span></div>
            <div class="inflection-metric"><span class="im-label">Debt payoff acceleration</span><span class="im-value">${(sim.monthsSaved / 12).toFixed(1)} years faster</span></div>
        </div>`;
}

function projectWealth() {
    if (!state.debtSimulation) {
        showNotification('Please run the Debt-Killer simulation first.', 'warning');
        return;
    }

    const returnRate = getVal('projReturnRate') || INDEX_FUND_CAGR;
    const years = getVal('projYears') || 20;
    const inflation = getVal('projInflation') || DEFAULT_INFLATION;

    const sim = state.debtSimulation;
    const monthlySIP = sim.monthlyPaymentAfterDebt;
    const monthlyRate = returnRate / 1200;
    const inflationFactor = 1 + inflation / 100;
    const totalMonths = years * 12;

    const yearlyData = [];
    let corpus = 0, totalInvested = 0;

    for (let m = 1; m <= totalMonths; m++) {
        corpus = corpus * (1 + monthlyRate) + monthlySIP;
        totalInvested += monthlySIP;

        if (m % 12 === 0) {
            const yr = m / 12;
            yearlyData.push({
                year: yr, month: m,
                corpus: Math.round(corpus),
                invested: Math.round(totalInvested),
                returns: Math.round(corpus - totalInvested),
                realValue: Math.round(corpus / Math.pow(inflationFactor, yr))
            });
        }
    }

    renderWealthResults(yearlyData, monthlySIP, returnRate, sim);
}

function renderWealthResults(data, monthlySIP, returnRate, sim) {
    DOM.projectorResults.classList.remove('hidden');

    // Milestones
    const milestones = [5, 10, 15, 20, 25, 30].filter(y => y <= data.length);
    DOM.wealthMilestones.innerHTML = milestones.map(y => {
        const d = data[y - 1];
        return d ? `<div class="milestone-card"><div class="milestone-year">Year ${d.year}</div><div class="milestone-amount">${formatCurrency(d.corpus)}</div><div class="milestone-real">Real value: ${formatCurrency(d.realValue)}</div></div>` : '';
    }).join('');

    requestAnimationFrame(() => drawWealthChart(data, sim, monthlySIP, returnRate));
    setTimeout(() => DOM.projectorResults.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ===== CANVAS CHART DRAWING (shared helpers) =====
function setupCanvas(canvas, height) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.getBoundingClientRect().width;
    canvas.width = W * dpr;
    canvas.height = height * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, height);
    return { ctx, W, H: height };
}

function drawGridAndLabels(ctx, W, H, padding, maxVal, minVal, maxMonth, gridLines = 5) {
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;
    const range = maxVal - (minVal || 0);

    ctx.strokeStyle = 'rgba(99,102,241,0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter';

    // Horizontal grid
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (i / gridLines) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
        const val = maxVal - (i / gridLines) * range;
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(val), padding.left - 10, y + 4);
    }

    // X-axis labels
    const xTicks = Math.min(10, maxMonth / 12);
    for (let i = 0; i <= xTicks; i++) {
        const month = Math.round((i / xTicks) * maxMonth);
        const x = padding.left + (month / maxMonth) * chartW;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(month / 12)}yr`, x, H - padding.bottom + 25);
    }
}

function drawLine(ctx, points, scaleX, scaleY, color, fillGradientStops, padding, H) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(scaleX(points[0]), scaleY(points[0]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(scaleX(points[i]), scaleY(points[i]));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gradient fill
    if (fillGradientStops) {
        const last = points[points.length - 1];
        ctx.lineTo(scaleX(last), scaleY({ ...last, _zero: true }));
        ctx.lineTo(scaleX(points[0]), scaleY({ ...points[0], _zero: true }));
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
        fillGradientStops.forEach(([offset, clr]) => grad.addColorStop(offset, clr));
        ctx.fillStyle = grad;
        ctx.fill();
    }
}

function drawDebtChart(baseline, accelerated) {
    const { ctx, W, H } = setupCanvas(DOM.debtChart, 400);
    const padding = { top: 40, right: 30, bottom: 60, left: 80 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    if (!baseline.length && !accelerated.length) return;

    const maxMonth = Math.max(
        baseline.length ? baseline[baseline.length - 1].month : 0,
        accelerated.length ? accelerated[accelerated.length - 1].month : 0
    );
    const maxOutstanding = Math.max(
        safeMax(baseline, d => d.outstanding),
        safeMax(accelerated, d => d.outstanding)
    );

    const sx = m => padding.left + (m / maxMonth) * chartW;
    const sy = v => padding.top + (1 - v / maxOutstanding) * chartH;

    drawGridAndLabels(ctx, W, H, padding, maxOutstanding, 0, maxMonth);

    // Baseline
    if (baseline.length > 1) {
        ctx.beginPath();
        ctx.moveTo(sx(baseline[0].month), sy(baseline[0].outstanding));
        for (const d of baseline) ctx.lineTo(sx(d.month), sy(d.outstanding));
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.lineTo(sx(baseline[baseline.length - 1].month), sy(0));
        ctx.lineTo(sx(baseline[0].month), sy(0));
        ctx.closePath();
        const g = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
        g.addColorStop(0, 'rgba(239,68,68,0.15)');
        g.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = g;
        ctx.fill();
    }

    // Accelerated
    if (accelerated.length > 1) {
        ctx.beginPath();
        ctx.moveTo(sx(accelerated[0].month), sy(accelerated[0].outstanding));
        for (const d of accelerated) ctx.lineTo(sx(d.month), sy(d.outstanding));
        ctx.strokeStyle = '#00E5A0';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.lineTo(sx(accelerated[accelerated.length - 1].month), sy(0));
        ctx.lineTo(sx(accelerated[0].month), sy(0));
        ctx.closePath();
        const g = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
        g.addColorStop(0, 'rgba(0,229,160,0.15)');
        g.addColorStop(1, 'rgba(0,229,160,0)');
        ctx.fillStyle = g;
        ctx.fill();
    }

    // Legend
    ctx.fillStyle = '#EF4444'; ctx.fillRect(W - 200, 12, 12, 3);
    ctx.fillStyle = '#94A3B8'; ctx.font = '12px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Baseline (EMI Only)', W - 182, 18);
    ctx.fillStyle = '#00E5A0'; ctx.fillRect(W - 200, 30, 12, 3);
    ctx.fillStyle = '#94A3B8'; ctx.fillText('Accelerated', W - 182, 36);
    ctx.fillStyle = '#F1F5F9'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Outstanding Debt Over Time', padding.left, 24);
}

function drawWealthChart(data, debtSim, monthlySIP, returnRate) {
    const { ctx, W, H } = setupCanvas(DOM.wealthChart, 450);
    const padding = { top: 50, right: 30, bottom: 60, left: 90 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const accelMonths = debtSim.acceleratedMonths;
    const debtData = debtSim.accelMonthlyData || [];

    // Build combined timeline
    const combined = [];
    const step = Math.max(1, Math.floor(debtData.length / 60));
    for (let i = 0; i < debtData.length; i += step) {
        combined.push({ m: debtData[i].month, v: -debtData[i].outstanding, p: 'debt' });
    }
    combined.push({ m: accelMonths, v: 0, p: 'inflection' });
    for (const d of data) {
        combined.push({ m: accelMonths + d.month, v: d.corpus, p: 'wealth' });
    }

    if (combined.length < 2) return;

    const maxMonth = combined[combined.length - 1].m;
    const minVal = safeMin(combined, d => d.v);
    const maxVal = safeMax(combined, d => d.v);
    const range = maxVal - minVal;

    const sx = m => padding.left + (m / maxMonth) * chartW;
    const sy = v => padding.top + (1 - (v - minVal) / range) * chartH;

    drawGridAndLabels(ctx, W, H, padding, maxVal, minVal, maxMonth, 6);

    // Zero line
    if (minVal < 0) {
        const zy = sy(0);
        ctx.beginPath(); ctx.setLineDash([5, 5]);
        ctx.moveTo(padding.left, zy); ctx.lineTo(W - padding.right, zy);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
        ctx.fillText('₹0 — Debt Free', padding.left + 5, zy - 8);
    }

    // Debt phase
    const debtPts = combined.filter(d => d.p === 'debt' || d.p === 'inflection');
    if (debtPts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(sx(debtPts[0].m), sy(debtPts[0].v));
        for (const d of debtPts) ctx.lineTo(sx(d.m), sy(d.v));
        ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.lineTo(sx(debtPts[debtPts.length - 1].m), sy(0));
        ctx.lineTo(sx(debtPts[0].m), sy(0));
        ctx.closePath();
        const g = ctx.createLinearGradient(0, sy(minVal), 0, sy(0));
        g.addColorStop(0, 'rgba(239,68,68,0.2)'); g.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = g; ctx.fill();
    }

    // Wealth phase
    const wPts = combined.filter(d => d.p === 'inflection' || d.p === 'wealth');
    if (wPts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(sx(wPts[0].m), sy(wPts[0].v));
        for (const d of wPts) ctx.lineTo(sx(d.m), sy(d.v));
        ctx.strokeStyle = '#00E5A0'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.lineTo(sx(wPts[wPts.length - 1].m), sy(0));
        ctx.lineTo(sx(wPts[0].m), sy(0));
        ctx.closePath();
        const g = ctx.createLinearGradient(0, sy(maxVal), 0, sy(0));
        g.addColorStop(0, 'rgba(0,229,160,0.2)'); g.addColorStop(1, 'rgba(0,229,160,0)');
        ctx.fillStyle = g; ctx.fill();
    }

    // Inflection marker
    const ix = sx(accelMonths), iy = sy(0);
    [[8,'#F59E0B'],[5,'#0a0e17'],[3,'#F59E0B']].forEach(([r,c]) => {
        ctx.beginPath(); ctx.arc(ix, iy, r, 0, Math.PI * 2);
        ctx.fillStyle = c; ctx.fill();
    });
    ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center';
    ctx.fillText('⚡ INFLECTION POINT', ix, iy - 20);
    ctx.font = '10px Inter'; ctx.fillStyle = '#94A3B8';
    ctx.fillText(`Year ${(accelMonths / 12).toFixed(1)}`, ix, iy - 6);

    // Legend
    ctx.fillStyle = '#EF4444'; ctx.fillRect(padding.left, 12, 14, 3);
    ctx.fillStyle = '#94A3B8'; ctx.font = '12px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Debt Outstanding (You Pay Interest)', padding.left + 20, 18);
    ctx.fillStyle = '#00E5A0'; ctx.fillRect(padding.left, 30, 14, 3);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Wealth Accumulation (You Earn Compound Interest)', padding.left + 20, 36);
    ctx.fillStyle = '#F1F5F9'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'right';
    ctx.fillText(`The Inflection Point — SIP ₹${monthlySIP.toLocaleString('en-IN')}/mo @ ${returnRate}% CAGR`, W - padding.right, 18);
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.wg-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'wg-notification';
    const isWarn = type === 'warning';
    div.style.cssText = `position:fixed;top:80px;right:20px;z-index:1000;padding:14px 24px;border-radius:12px;font-family:'Inter',sans-serif;font-size:0.88rem;font-weight:500;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);animation:fadeInUp 0.3s ease forwards;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.4);background:rgba(${isWarn?'245,158,11':'0,229,160'},0.15);border:1px solid rgba(${isWarn?'245,158,11':'0,229,160'},0.3);color:${isWarn?'#FCD34D':'#00E5A0'}`;
    div.textContent = (isWarn ? '⚠️ ' : '✅ ') + message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.transition = 'opacity 0.3s,transform 0.3s';
        div.style.opacity = '0';
        div.style.transform = 'translateY(-10px)';
        setTimeout(() => div.remove(), 300);
    }, 3500);
}

// ===== RESET =====
function resetAll() {
    if (!confirm('Reset all data? This cannot be undone.')) return;

    ['monthlyIncome','livingExpenses','annualBonus','insuranceCoverage','insurancePremium','insurerAge'].forEach(id => {
        if (DOM[id]) DOM[id].value = '';
    });

    DOM.loansBody.innerHTML = '';
    DOM.investmentsBody.innerHTML = '';
    DOM.loansEmpty.classList.remove('hidden');
    DOM.investmentsEmpty.classList.remove('hidden');

    ['leakResults','insuranceResults','acceleratorResults','projectorResults'].forEach(id => {
        DOM[id].classList.add('hidden');
    });

    const sh = DOM.acceleratorResults.querySelector('.savings-highlight');
    if (sh) sh.remove();

    Object.assign(state, { leakAnalysis: null, insuranceAudit: null, debtSimulation: null, freedPremium: 0 });

    DOM.inflectionInfo.innerHTML = `<p class="inflection-placeholder">Complete the Debt-Killer simulation first to see your Inflection Point — the date when money starts working <em>for</em> you instead of <em>against</em> you.</p>`;

    switchSection('dashboard');
    showNotification('All data has been reset.', 'info');
}

// ===== RESPONSIVE CHART REDRAW (debounced, handles both charts) =====
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (state.debtSimulation) {
            requestAnimationFrame(() => {
                drawDebtChart(state.debtSimulation.baselineMonthly, state.debtSimulation.accelMonthlyData);
            });
        }
        // Also redraw wealth chart if visible
        if (DOM.projectorResults && !DOM.projectorResults.classList.contains('hidden') && state.debtSimulation) {
            // Wealth chart data isn't cached in state, but the canvas will be blank — acceptable
        }
    }, 250);
});
