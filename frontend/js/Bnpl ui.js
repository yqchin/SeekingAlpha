
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

    /* Login interactions */
    var loginForm = $('login-form');
    var loginUsername = $('login-username');
    var logoutUsername = $('logout-username');

    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault();
            var user = loginUsername ? loginUsername.value.trim() : '';

            if (!user) {
                showToast('Please enter your username.');
                return;
            }

            if (logoutUsername) logoutUsername.textContent = 'Username: ' + user;
            closeLoginView();
            showToast('Welcome back to SALaterPay.');
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

})();