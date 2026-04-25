from pathlib import Path
import joblib
import pandas as pd

PAY_FREQUENCY_MAP = {'W': 0, 'B': 1, 'S': 2, 'M': 3, 'I': 4}

LEAD_RISK_MAP = {
    'organic': 0, 'prescreen': 1, 'rc_returning': 2,
    'express': 3, 'repeat': 3, 'instant-offer': 3,
    'lead': 4, 'california': 4, 'bvMandatory': 5,
}

_MODEL_PATH = Path(__file__).parent.parent / 'model' / 'rf_pipeline.joblib'

# (score_min, score_max, loan_min, loan_max)
_BAND_CONFIG = {
    'Healthy':  (60, 100, 1000, 3000),
    'Cautious': (40,  59,  300, 1000),
    'Risky':    ( 0,  39,    0,    0),
}
_LOYALTY_BONUS_PER_PAYOFF = 0.05
_LOYALTY_CAP = 5

_model = None


def _load_model():
    global _model
    if _model is None:
        _model = joblib.load(_MODEL_PATH)
    return _model


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

    t = (credit_score - score_min) / (score_max - score_min)
    base_limit = loan_min + t * (loan_max - loan_min)

    loyalty = 1 + min(n_paid_off, _LOYALTY_CAP) * _LOYALTY_BONUS_PER_PAYOFF
    limit = base_limit * loyalty

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
    repayment_ratio = scheduled_payment_amount / loan_amount if loan_amount > 0 else None

    features = {
        'nPaidOff':                         n_paid_off,
        'payFrequency':                     PAY_FREQUENCY_MAP.get(pay_frequency),
        'loanAmount':                       loan_amount,
        'apr':                              apr,
        'repayment_ratio':                  repayment_ratio,
        'leadType_risk':                    LEAD_RISK_MAP.get(lead_type),
        'clearfraudscore':                  clearfraud_score,
        'ind_totalnumberoffraudindicators': total_fraud_indicators,
    }

    X = pd.DataFrame([features])
    model = _load_model()

    bad_proba  = model.predict_proba(X)[0, 1]
    good_proba = model.predict_proba(X)[0, 0]
    credit     = _to_credit_score(bad_proba)
    loan_limit = calculate_loan_limit(credit['score'], credit['band'], n_paid_off)
    decision   = 'APPROVE' if loan_limit > 0 else 'REJECT'

    return {
        'decision':     decision,
        'credit_score': credit['score'],
        'band':         credit['band'],
        'loan_limit':   loan_limit,
        'bad_proba':    round(bad_proba, 4),
        'good_proba':   round(good_proba, 4),
    }