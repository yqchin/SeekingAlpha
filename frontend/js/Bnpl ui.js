
/* ─── SALaterPay UI — bnpl-ui.js ─────────────────────────────────────── */

(function () {

    /* ── Helpers ──────────────────────────────────────────────────────── */

    var toastTimer;

    function showToast(msg) {
        var toast = document.getElementById('notify-toast');
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.add('show');
        toastTimer = setTimeout(function () {
            toast.classList.remove('show');
        }, 2800);
    }

    function $(id) {
        return document.getElementById(id);
    }

    /* ── Login view ───────────────────────────────────────────────────── */

    function closeLoginView() {
        var loginView = $('login-view');
        if (!loginView) return;
        loginView.classList.remove('show');
        loginView.setAttribute('aria-hidden', 'true');
    }

    function openLoginView() {
        var loginView = $('login-view');
        if (!loginView) return;
        loginView.classList.add('show');
        loginView.setAttribute('aria-hidden', 'false');
    }

    /* ── Logout view ──────────────────────────────────────────────────── */

    function openLogoutView() {
        var logoutView = $('logout-view');
        if (!logoutView) return;
        logoutView.classList.add('show');
        logoutView.setAttribute('aria-hidden', 'false');
    }

    function closeLogoutView() {
        var logoutView = $('logout-view');
        if (!logoutView) return;
        logoutView.classList.remove('show');
        logoutView.setAttribute('aria-hidden', 'true');
    }

    /* ── Bills slide-over ─────────────────────────────────────────────── */

    function openBills() {
        var view = $('bills-view');
        if (!view) return;
        view.classList.add('show');
        view.setAttribute('aria-hidden', 'false');
    }

    function closeBills() {
        var view = $('bills-view');
        if (!view) return;
        view.classList.remove('show');
        view.setAttribute('aria-hidden', 'true');
    }

    /* ── Bills inner tabs (Upcoming / Billed) ─────────────────────────── */

    function switchBillsTab(show, hide, activeBtn, inactiveBtn) {
        var showEl = $(show);
        var hideEl = $(hide);
        var aBtn   = $(activeBtn);
        var iBtn   = $(inactiveBtn);
        if (showEl) showEl.classList.remove('is-hidden');
        if (hideEl) hideEl.classList.add('is-hidden');
        if (aBtn)   aBtn.classList.add('active');
        if (iBtn)   iBtn.classList.remove('active');
    }

    /* ── Payment confirmation page ────────────────────────────────────── */

    function openPaymentConfirmation() {
        var view = $('payment-confirm-view');
        if (!view) return;
        view.classList.add('show');
        view.setAttribute('aria-hidden', 'false');
    }

    function closePaymentConfirmation() {
        var view = $('payment-confirm-view');
        if (!view) return;
        view.classList.remove('show');
        view.setAttribute('aria-hidden', 'true');
    }

    function populatePaymentConfirmation(amount) {
        var amountEl = $('confirm-paid-amount');
        var dateEl = $('confirm-paid-date');
        var txEl = $('confirm-transaction-id');
        if (amountEl) amountEl.textContent = amount;
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleString('en-MY', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        if (txEl) {
            txEl.textContent = 'SA-' + Date.now().toString().slice(-8);
        }
    }

    function closeAllOverlayViews() {
        closeBills();
        closePaymentConfirmation();
        closeLogoutView();
    }

    /* ── Credit API ───────────────────────────────────────────────────── */

    var API_URL = 'http://seekingalpha-alb-822910622.ap-southeast-1.elb.amazonaws.com/api/predict-credit/';

    function formatRM(amount) {
        return 'RM ' + Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function bandToLabel(band, decision) {
        if (decision === 'REJECT') return 'Risky';
        var map = { 'Healthy': 'Healthy', 'Moderate': 'Cautious', 'Poor': 'Risky' };
        return map[band] || scoreToBandLabel(null, band);
    }

    function clamp(value, min, max) {
        value = Number(value);
        if (!isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    function scoreToBandLabel(score, fallback) {
        if (score === null || score === undefined || score === '') return fallback || 'Cautious';
        score = clamp(score, 0, 100);
        if (score >= 70) return 'Healthy';
        if (score >= 50) return 'Cautious';
        return 'Risky';
    }

    function formatPercent(value) {
        if (value === null || value === undefined || value === '') return '--';
        value = Number(value);
        if (!isFinite(value)) return '--';
        if (value <= 1) value = value * 100;
        return value.toFixed(1) + '%';
    }

    function formatDriverValue(value) {
        if (value === null || value === undefined || value === '') return 'Not available';
        if (typeof value === 'number') return Number(value.toFixed(2)).toLocaleString('en-MY');
        return String(value);
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    var DRIVER_GUIDANCE = {
        clearfraudscore: {
            issue: 'Thin or weaker credit history',
            action: 'Build a cleaner CCRIS record with consistent repayments.',
            direction: 'Increase'
        },
        repayment_ratio: {
            issue: 'Existing debt is taking up too much repayment capacity',
            action: 'Settle outstanding debt before applying again.',
            direction: 'Decrease'
        },
        loanAmount: {
            issue: 'Requested amount is high for the current profile',
            action: 'Try a smaller loan amount first.',
            direction: 'Decrease'
        },
        payFrequency: {
            issue: 'Repayment schedule could be stronger',
            action: 'Choose a more frequent repayment plan when possible.',
            direction: 'Increase'
        },
        nPaidOff: {
            issue: 'Limited completed repayment history',
            action: 'Complete more repayments on time.',
            direction: 'Increase'
        },
        apr: {
            issue: 'High-cost borrowing exposure',
            action: 'Reduce expensive borrowing where possible.',
            direction: 'Decrease'
        },
        leadType_risk: {
            issue: 'Application channel carries extra risk',
            action: 'Use safer or verified application channels.',
            direction: 'Decrease'
        },
        ind_totalnumberoffraudindicators: {
            issue: 'Suspicious transaction indicators were detected',
            action: 'Reduce unusual or suspicious transaction behavior.',
            direction: 'Decrease'
        }
    };

    var dashboardData = {
        credit_score: 82,
        band: 'Healthy',
        decision: 'APPROVE',
        reject_drivers: []
    };

    function normalizeDriver(raw) {
        var feature = raw.feature || raw.name || raw.driver || raw.column || '';
        var contribution = Number(raw.contribution || raw.impact || raw.weight || 0);
        return {
            feature: feature,
            contribution: isFinite(contribution) ? Math.abs(contribution) : 0,
            value: raw.value !== undefined ? raw.value : raw.current_value
        };
    }

    function sortedDrivers(data) {
        return (data.reject_drivers || [])
            .map(normalizeDriver)
            .filter(function (driver) { return driver.feature; })
            .sort(function (a, b) { return b.contribution - a.contribution; });
    }

    function renderDrivers(data) {
        var list = $('driver-list');
        var copy = $('credit-improve-copy');
        if (!list) return;

        var drivers = sortedDrivers(data);
        list.innerHTML = '';

        if (copy) {
            copy.textContent = data.decision === 'REJECT'
                ? 'These factors had the largest effect on the rejected application. The simulator below is only an educational estimate.'
                : 'Your account is in good standing. Use these habits to protect or improve your score over time.';
        }

        if (!drivers.length) {
            list.innerHTML =
                '<div class="driver-empty">' +
                    '<strong>Keep building positive history</strong>' +
                    '<span>Pay on time, keep balances manageable, and avoid unusual transaction activity.</span>' +
                '</div>';
            return;
        }

        drivers.forEach(function (driver) {
            var guide = DRIVER_GUIDANCE[driver.feature] || {
                issue: driver.feature.replace(/_/g, ' '),
                action: 'Improve this factor where possible before applying again.',
                direction: 'Improve'
            };
            var level = driver.contribution >= 0.25 ? 'High' : driver.contribution >= 0.1 ? 'Medium' : 'Low';
            var card = document.createElement('article');
            card.className = 'driver-card impact-' + level.toLowerCase();
            card.innerHTML =
                '<div class="driver-card-head">' +
                    '<strong>' + escapeHtml(guide.issue) + '</strong>' +
                    '<span>' + level + ' impact</span>' +
                '</div>' +
                '<p>' + escapeHtml(guide.action) + '</p>' +
                '<div class="driver-meta">' +
                    '<span>Current: <b>' + escapeHtml(formatDriverValue(driver.value)) + '</b></span>' +
                    '<span>Direction: <b>' + escapeHtml(guide.direction) + '</b></span>' +
                '</div>';
            list.appendChild(card);
        });
    }

    function driverWeight(feature) {
        var match = sortedDrivers(dashboardData).filter(function (driver) {
            return driver.feature === feature;
        })[0];
        return match ? clamp(match.contribution, 0.04, 0.45) : 0.08;
    }

    function simulatorValue(id) {
        var el = $(id);
        if (!el) return 0;
        return clamp(el.value, 0, 100) / 100;
    }

    function updateSimulator() {
        var score = clamp(dashboardData.credit_score || 0, 0, 100);
        var uplift =
            simulatorValue('sim-debt') * 22 * driverWeight('repayment_ratio') +
            simulatorValue('sim-ccris') * 24 * driverWeight('clearfraudscore') +
            simulatorValue('sim-loan') * 18 * driverWeight('loanAmount') +
            Number(($('sim-frequency') || {}).value || 0) * 14 * driverWeight('payFrequency');
        uplift = clamp(uplift, 0, 100 - score);

        var projected = Math.round(score + uplift);
        var delta = projected - Math.round(score);
        var currentEl = $('sim-current-score');
        var projectedEl = $('sim-projected-score');
        var deltaEl = $('sim-score-delta');
        var bandEl = $('sim-projected-band');
        var fillEl = $('sim-meter-fill');

        if (currentEl) currentEl.textContent = Math.round(score);
        if (projectedEl) projectedEl.textContent = projected;
        if (deltaEl) deltaEl.textContent = '+' + delta;
        if (bandEl) bandEl.textContent = 'Projected band: ' + scoreToBandLabel(projected);
        if (fillEl) fillEl.style.width = projected + '%';
    }

    function populateDashboard(data) {
        var limitEl        = $('available-limit');
        var limitSubEl     = document.querySelector('.limit-sub');
        var riskNumEl      = $('risk-score-number');
        var riskBandEl     = $('risk-band');
        var riskCardEl     = $('risk-card');
        var riskPointerEl  = $('risk-pointer');
        var badProbaEl     = $('bad-proba');
        var goodProbaEl    = $('good-proba');

        dashboardData = data || dashboardData;

        var limit = data.decision === 'REJECT' ? 0 : data.loan_limit;
        var score = clamp(data.credit_score, 0, 100);

        if (limitEl)    limitEl.textContent = formatRM(limit);
        if (limitSubEl) limitSubEl.innerHTML = 'Total Limit ' +
            Number(limit).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
            ' <i class="fa-solid fa-angle-right"></i>';
        if (riskNumEl)  riskNumEl.textContent = Math.round(score);
        if (riskBandEl) riskBandEl.textContent = bandToLabel(data.band, data.decision);
        if (riskPointerEl) riskPointerEl.style.left = score + '%';
        if (badProbaEl) badProbaEl.textContent = formatPercent(data.bad_proba);
        if (goodProbaEl) goodProbaEl.textContent = formatPercent(data.good_proba);
        if (riskCardEl) riskCardEl.dataset.riskScore = score;
        renderDrivers(data);
        updateSimulator();
    }

    /* Login interactions */
    var loginForm     = $('login-form');
    var loginUsername = $('login-username');
    var logoutUsername = $('logout-username');

    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault();
            var email     = loginUsername ? loginUsername.value.trim() : '';
            var errorEl   = $('login-error');
            var submitBtn = $('login-submit-btn');

            if (errorEl) errorEl.textContent = '';

            if (!email) {
                if (errorEl) errorEl.textContent = 'Please enter your email address.';
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
                return;
            }

            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in…'; }

            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_email: email })
            })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }

                var displayName = data.customer_name || email;
                if (logoutUsername) logoutUsername.textContent = 'Signed in as: ' + displayName;

                populateDashboard(data);
                closeLoginView();

                if (data.decision === 'APPROVE') {
                    showToast('Welcome back, ' + displayName + '!');
                } else {
                    showToast('Signed in. Credit application not approved.');
                }
            })
            .catch(function () {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
                if (errorEl) errorEl.textContent = 'Could not retrieve your data. Please try again.';
            });
        });
    }

    var logoutCancelBtn = $('logout-cancel-btn');
    if (logoutCancelBtn) {
        logoutCancelBtn.addEventListener('click', function () {
            closeLogoutView();
            showToast('Stayed signed in.');
        });
    }

    var logoutConfirmBtn = $('logout-confirm-btn');
    if (logoutConfirmBtn) {
        logoutConfirmBtn.addEventListener('click', function () {
            closeAllOverlayViews();
            openLoginView();
            if (loginUsername) loginUsername.value = '';
            showToast('You have logged out.');
        });
    }

    /* ── Wire up all buttons ──────────────────────────────────────────── */

    /* Bill card → open bills slide-over */
    var billCard = $('bill-card');
    if (billCard) {
        billCard.addEventListener('click', openBills);
        billCard.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openBills();
            }
        });
    }

    /* Bills back button → close slide-over */
    var billsBackBtn = $('bills-back-btn');
    if (billsBackBtn) {
        billsBackBtn.addEventListener('click', closeBills);
    }

    /* Bills inner tabs */
    var upcomingBtn = $('bills-upcoming-btn');
    if (upcomingBtn) {
        upcomingBtn.addEventListener('click', function () {
            switchBillsTab('bills-upcoming-list', 'bills-billed-list', 'bills-upcoming-btn', 'bills-billed-btn');
        });
    }

    var billedBtn = $('bills-billed-btn');
    if (billedBtn) {
        billedBtn.addEventListener('click', function () {
            switchBillsTab('bills-billed-list', 'bills-upcoming-list', 'bills-billed-btn', 'bills-upcoming-btn');
        });
    }

    /* Bill items → toast */
    ['upcoming-apr-btn', 'billed-mar-btn', 'billed-feb-btn', 'billed-jan-btn'].forEach(function (id) {
        var el = $(id);
        if (!el) return;
        el.addEventListener('click', function () {
            var month = el.querySelector('.bill-month');
            var amount = el.querySelector('.bill-amount-wrap strong');
            var label = (month ? month.textContent : '') + ' bill';
            var val   = amount ? amount.textContent : '';
            showToast(label + ': ' + val);
        });
    });

    /* Bills clock button */
    var billsClockBtn = $('bills-clock-btn');
    if (billsClockBtn) {
        billsClockBtn.addEventListener('click', function () {
            showToast('Bill history loaded.');
        });
    }

    /* Pay with SA → confirmation page */
    var payBtn = $('pay-btn');
    if (payBtn) {
        payBtn.addEventListener('click', function () {
            var amt = $('action-next-payment') ? $('action-next-payment').textContent : '';
            closeBills();
            populatePaymentConfirmation(amt || 'RM 0.00');
            openPaymentConfirmation();
        });
    }

    /* Confirmation page actions */
    var paymentBackBtn = $('payment-back-btn');
    if (paymentBackBtn) {
        paymentBackBtn.addEventListener('click', function () {
            closePaymentConfirmation();
            showToast('Returned to dashboard.');
        });
    }

    var paymentDoneBtn = $('payment-done-btn');
    if (paymentDoneBtn) {
        paymentDoneBtn.addEventListener('click', function () {
            closePaymentConfirmation();
            showToast('Payment flow completed.');
        });
    }

    var paymentViewBillsBtn = $('payment-view-bills-btn');
    if (paymentViewBillsBtn) {
        paymentViewBillsBtn.addEventListener('click', function () {
            closePaymentConfirmation();
            switchBillsTab('bills-upcoming-list', 'bills-billed-list', 'bills-upcoming-btn', 'bills-billed-btn');
            openBills();
        });
    }

    /* Profile button */
    var profileBtn = $('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function () {
            openLogoutView();
        });
    }

    ['sim-debt', 'sim-ccris', 'sim-loan', 'sim-frequency'].forEach(function (id) {
        var el = $(id);
        if (!el) return;
        el.addEventListener('input', updateSimulator);
        el.addEventListener('change', updateSimulator);
    });

    renderDrivers(dashboardData);
    updateSimulator();

    /* Password show/hide toggle */
    var eyeBtn  = $('login-eye-btn');
    var eyeIcon = $('login-eye-icon');
    var pwdInput = $('login-password');
    if (eyeBtn && pwdInput) {
        eyeBtn.addEventListener('click', function () {
            var isHidden = pwdInput.type === 'password';
            pwdInput.type = isHidden ? 'text' : 'password';
            if (eyeIcon) {
                eyeIcon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            }
        });
    }

    /* Forgot password toast */
    var forgotBtn = document.querySelector('.login-forgot-btn');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', function () {
            showToast('Password reset coming soon.');
        });
    }

})();
