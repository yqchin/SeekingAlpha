
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

    /* ── Tab row (My Bill / History) ──────────────────────────────────── */

    function setTabActive(activeId, inactiveId) {
        var a = $(activeId);
        var b = $(inactiveId);
        if (a) a.classList.add('active');
        if (b) b.classList.remove('active');
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

    function bandToInterestRate(band) {
        var map = { 'Healthy': '1.8% / year', 'Moderate': '3.5% / year', 'Poor': '6.0% / year' };
        return map[band] || '6.0% / year';
    }

    function scoreToOrbClass(score) {
        if (score >= 70) return 'risk-high';
        if (score >= 50) return 'risk-medium';
        return 'risk-low';
    }

    function bandToLabel(band, decision) {
        if (decision === 'REJECT') return 'High Risk';
        var map = { 'Healthy': 'Low Risk', 'Moderate': 'Medium Risk', 'Poor': 'High Risk' };
        return map[band] || band;
    }

    function populateDashboard(data) {
        var limitEl        = $('available-limit');
        var limitSubEl     = document.querySelector('.limit-sub');
        var riskNumEl      = $('risk-score-number');
        var riskBandEl     = $('risk-band');
        var interestEl     = $('interest-rate');
        var riskOrbEl      = $('risk-orb');
        var riskCardEl     = $('risk-card');

        var limit = data.decision === 'REJECT' ? 0 : data.loan_limit;

        if (limitEl)    limitEl.textContent = formatRM(limit);
        if (limitSubEl) limitSubEl.innerHTML = 'Total Limit ' +
            Number(limit).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
            ' <i class="fa-solid fa-angle-right"></i>';
        if (riskNumEl)  riskNumEl.textContent = data.credit_score;
        if (riskBandEl) riskBandEl.textContent = bandToLabel(data.band, data.decision);
        if (interestEl) interestEl.textContent = bandToInterestRate(data.band);
        if (riskOrbEl) {
            riskOrbEl.className = 'risk-orb ' + scoreToOrbClass(data.credit_score);
        }
        if (riskCardEl) riskCardEl.dataset.riskScore = data.credit_score;
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

    /* My Bill tab → open bills slide-over */
    var myBillBtn = $('my-bill-btn');
    if (myBillBtn) {
        myBillBtn.addEventListener('click', function () {
            setTabActive('my-bill-btn', 'transaction-btn');
            openBills();
        });
    }

    /* History tab → toast (placeholder) */
    var txBtn = $('transaction-btn');
    if (txBtn) {
        txBtn.addEventListener('click', function () {
            setTabActive('transaction-btn', 'my-bill-btn');
            showToast('Transaction history coming soon.');
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
            setTabActive('my-bill-btn', 'transaction-btn');
            switchBillsTab('bills-upcoming-list', 'bills-billed-list', 'bills-upcoming-btn', 'bills-billed-btn');
            openBills();
        });
    }

    /* Quick grid buttons → individual toasts */
    var offersBtn = $('offers-btn');
    if (offersBtn) {
        offersBtn.addEventListener('click', function () {
            showToast('Best Offers — exclusive deals for you!');
        });
    }

    var vouchersBtn = $('vouchers-btn');
    if (vouchersBtn) {
        vouchersBtn.addEventListener('click', function () {
            showToast('Vouchers — your free vouchers are ready.');
        });
    }

    var coinsBtn = $('coins-btn');
    if (coinsBtn) {
        coinsBtn.addEventListener('click', function () {
            showToast('SA Coins — earn coins on every purchase.');
        });
    }

    var financeBtn = $('finance-btn');
    if (financeBtn) {
        financeBtn.addEventListener('click', function () {
            showToast('Financial Tips — smart tips to save more.');
        });
    }

    /* SA Loans activate button */
    var activateBtn = $('activate-btn');
    if (activateBtn) {
        activateBtn.addEventListener('click', function () {
            showToast('SA Loans activated successfully.');
        });
    }

    /* SA Installments check now button */
    var splitBtn = $('split-btn');
    if (splitBtn) {
        splitBtn.addEventListener('click', function () {
            showToast('SA Installments — choose a plan that suits you.');
        });
    }

    /* SA Limit Boost button */
    var boostBtn = $('boost-btn');
    if (boostBtn) {
        boostBtn.addEventListener('click', function () {
            showToast('SA Limit Boost applied for selected merchants.');
        });
    }

    /* Notifications button */
    var notifyBtn = $('notify-btn');
    if (notifyBtn) {
        notifyBtn.addEventListener('click', function () {
            showToast('No new notifications.');
        });
    }

    /* Settings button */
    var settingsBtn = $('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            showToast('Settings coming soon.');
        });
    }

    /* Search button */
    var searchBtn = $('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function () {
            showToast('Search merchants coming soon.');
        });
    }

    /* Country pill */
    var countryBtn = $('country-btn');
    if (countryBtn) {
        countryBtn.addEventListener('click', function () {
            showToast('Country: Malaysia (MY)');
        });
    }

    /* Profile button */
    var profileBtn = $('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function () {
            openLogoutView();
        });
    }

    /* Back button (main header) */
    var backBtn = $('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            showToast('Navigate back.');
        });
    }

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