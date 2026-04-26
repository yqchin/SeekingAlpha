# 🧠 AI BNPL Credit Risk Engine

An AI-powered credit risk assessment system for Buy Now Pay Later (BNPL) platforms that predicts default risk, assigns credit scores, and dynamically adjusts loan limits.

---

## 🚀 Overview

BNPL platforms provide instant credit at checkout, but this introduces significant default risk due to limited credit history and lack of proper risk assessment.

This project builds a **machine learning-based credit risk system** to:
- Predict loan default probability
- Assign a credit score (0–100)
- Categorize users into risk bands
- Dynamically determine loan limits

---

## 📊 Dataset

- Total labeled loans: **29,692**
- Training set: **23,753**
- Test set: **5,939**
- Average loan amount: **$619.68**
- Average APR: **5.28%**
- External bureau coverage: **82.6%**

---

## 🧠 Features Used

- `clearfraudscore` – External credit/fraud score  
- `repayment_ratio` – Debt burden ratio  
- `nPaidOff` – Number of loans repaid  
- `apr` – Interest rate  
- `leadType_risk` – Acquisition channel risk  
- `loanAmount` – Loan size  
- `payFrequency` – Repayment frequency  
- `ind_totalnumberoffraudindicators` – Fraud signals  

---

## 🤖 Model

- **Model Used:** Random Forest (scikit-learn)
- **Why:** Best performance among tested models

### 📈 Performance

| Metric | Value |
|------|------|
| ROC-AUC | 0.7273 |
| Recall (Bad Loans) | 69% |
| Precision (Bad Loans) | 74% |
| Accuracy | 68% |

---

## 💳 Credit Scoring System

**Formula:**
Credit Score = (1 - Default Probability) × 100

### Risk Bands:
- **Healthy:** 60–100 (Low Risk)
- **Cautious:** 40–59 (Medium Risk)
- **Risky:** 0–39 (High Risk)

---

## 💰 Loan Limit Engine

| Risk Level | Loan Limit |
|-----------|----------|
| Healthy | $1,000 – $3,000 |
| Cautious | $300 – $1,000 |
| Risky | $0 (Auto Reject) |

**Adjustment Rule:**
- +5% per successful repayment
- Max +25%

---

## 📉 Business Impact

- Reduces credit losses by identifying high-risk borrowers early
- Improves approval quality and consistency
- Enables scalable and automated underwriting
- Supports personalized credit allocation

---

## 🏗️ System Architecture

- Frontend: Node.js
- Backend: Django REST API
- Model: scikit-learn (Random Forest)
- Database: MySQL (Amazon RDS)
- Deployment: AWS + Alibaba Cloud

---

## 🧪 How to Run

```bash
# Clone the repo
git clone https://github.com/your-username/your-repo.git

# Navigate into project
cd your-repo

# Install dependencies
pip install -r requirements.txt

# Run app
streamlit run app.py# 🧠 AI BNPL Credit Risk Engine

# Install dependencies
pip install -r requirements.txt

# Run app
streamlit run app.py
