import joblib
import pandas as pd
import shap

PAY_FREQUENCY_MAP = {'W': 0, 'B': 1, 'S': 2, 'M': 3, 'I': 4}

LEAD_RISK_MAP = {
    'organic': 0, 'prescreen': 1, 'rc_returning': 2,
    'express': 3, 'repeat': 3, 'instant-offer': 3,
    'lead': 4, 'california': 4, 'bvMandatory': 5,
}

# (score_min, score_max, loan_min, loan_max)
_BAND_CONFIG = {
    'Healthy':  (60, 100, 1000, 3000),
    'Cautious': (40,  59,  300, 1000),
    'Risky':    (  0, 39,    0,    0),
}
_LOYALTY_BONUS_PER_PAYOFF = 0.05  # +5% per paid-off loan, capped at +25%
_LOYALTY_CAP = 5


MODEL_PATH = 'model/rf_pipeline.joblib'
_model = None
_explainer = None


def _load_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def _load_explainer():
    global _explainer
    if _explainer is None:
        rf = _load_model().named_steps['rf']
        _explainer = shap.TreeExplainer(rf)
    return _explainer


def _explain_reject(X: pd.DataFrame) -> list[dict]:
    model = _load_model()
    X_imputed = model.named_steps['imputer'].transform(X)
    shap_values = _load_explainer().shap_values(X_imputed)
    # shape: (n_samples, n_features, n_classes) — take sample 0, class 1 (default)
    bad_shap = shap_values[0, :, 1]
    drivers = [
        {
            'feature': col,
            'contribution': round(float(sv), 4),
            'value': None if pd.isna(rv) else round(float(rv), 4),
        }
        for col, sv, rv in zip(X.columns, bad_shap, X.iloc[0])
        if sv > 0 and col not in {'leadType_risk', 'apr', 'ind_totalnumberoffraudindicators'}
    ]
    return sorted(drivers, key=lambda d: -d['contribution'])


def _to_credit_score(bad_proba: float) -> dict:
    score = round((1 - bad_proba) * 100)
    if score >= 60:
        band = 'Healthy'
    elif score >= 40:
        band = 'Cautious'
    else:
        band = 'Risky'
    return {'score': score, 'band': band}

def calculate_loan_limit(credit_score: int, band: str, n_paid_off: int = 0) -> float:
    score_min, score_max, loan_min, loan_max = _BAND_CONFIG[band]

    if band == 'Risky':
        return 0.0

    # Interpolate within band range
    t = (credit_score - score_min) / (score_max - score_min)
    base_limit = loan_min + t * (loan_max - loan_min)

    # Loyalty bonus for repeat customers (capped)
    loyalty = 1 + min(n_paid_off, _LOYALTY_CAP) * _LOYALTY_BONUS_PER_PAYOFF
    limit = base_limit * loyalty

    # Never exceed band ceiling even with loyalty bonus
    return round(min(limit, loan_max), 2)


def predict(
    n_paid_off: int,
    pay_frequency: str,
    loan_amount: float,
    apr: float,
    scheduled_payment_amount: float,
    lead_type: str,
    clearfraud_score: float | None = None,
    total_fraud_indicators: float | None = None,
) -> dict:
    """
    Predict whether a loan application is likely to default.

    Args:
        n_paid_off:                 Number of prior MoneyLion loans paid off
        pay_frequency:              Repayment frequency — 'W', 'B', 'S', 'M', or 'I'
        loan_amount:                Loan principal ($)
        apr:                        Annual percentage rate (%)
        scheduled_payment_amount:   Total originally scheduled repayment amount ($)
        lead_type:                  Lead source type (e.g. 'organic', 'bvMandatory')
        clearfraud_score:           Clarity fraud score (optional, pass None if unavailable)
        total_fraud_indicators:     Total number of fraud indicators (optional)

    Returns:
        dict with keys:
            decision        — 'APPROVE' or 'REJECT'
            credit_score    — integer score 0–100
            band            — 'Healthy', 'Cautious', or 'Risky'
            loan_limit      — approved loan ceiling ($); 0.0 if REJECT
            bad_proba       — probability of default (0.0 – 1.0)
            good_proba      — probability of repayment (0.0 – 1.0)
            reject_drivers  — list of SHAP feature contributions (REJECT only)
    """
    repayment_ratio = scheduled_payment_amount / loan_amount if loan_amount > 0 else None

    features = {
        'nPaidOff':                       n_paid_off,
        'payFrequency':                   PAY_FREQUENCY_MAP.get(pay_frequency),
        'loanAmount':                     loan_amount,
        'apr':                            apr,
        'repayment_ratio':                repayment_ratio,
        'leadType_risk':                  LEAD_RISK_MAP.get(lead_type),
        'clearfraudscore':                clearfraud_score,
        'ind_totalnumberoffraudindicators': total_fraud_indicators,
    }

    X = pd.DataFrame([features])
    model = _load_model()

    bad_proba  = model.predict_proba(X)[0, 1]
    good_proba = model.predict_proba(X)[0, 0]
    credit     = _to_credit_score(bad_proba)
    loan_limit = calculate_loan_limit(credit['score'], credit['band'], n_paid_off)
    decision   = 'APPROVE' if loan_limit > 0 else 'REJECT'

    result = {
        'decision':     decision,
        'credit_score': credit['score'],
        'band':         credit['band'],
        'loan_limit':   loan_limit,
        'bad_proba':    round(bad_proba, 4),
        'good_proba':   round(good_proba, 4),
    }
    if decision == 'REJECT':
        result['reject_drivers'] = _explain_reject(X)
    return result
