# DermAI — Multi-Class Skin Lesion AI Screening Platform

DermAI is an AI-powered dermatology screening assistant designed to analyze dermatoscopic and clinical skin lesion images across all 7 standard HAM10000 categories.

---

## 🔬 Model Architecture & Training Details

- **Backbone**: EfficientNet-B0 (Pre-trained on ImageNet, fine-tuned via `timm`)
- **Loss Function**: **Class-Weighted Focal Loss ($\gamma = 2.0$)** with **$1.5\times$ Melanoma Alpha Weighting** to prioritize high-risk sensitivity while mitigating the natural 67% `nv` (melanocytic nevus) class imbalance.
- **Optimization**: Cosine Annealing Learning Rate Schedule across **4 Epochs** with full PyTorch determinism (seed 42).
- **Data Splitting**: **Strict Lesion-Disjoint Splitting** (grouped by physical `lesion_id`). Multi-photo lesions from different angles/times are kept together atomically to ensure zero intra-patient leakage across splits.
- **Dataset Partitioning**:
  - `Train`: **8,418 images** ([train_split.csv](backend/data/train_split.csv))
  - `Validation`: **1,437 images** ([val_split.csv](backend/data/val_split.csv))
  - `Held-Out Test Set`: **158 images** ([eval_holdout_set.csv](backend/data/eval_holdout_set.csv)) — 100% unseen physical lesions across all 7 classes.

---

## 📊 Benchmark & Evaluation Results (Internal Held-Out Test Set)

Evaluated strictly on the **158-sample leak-free held-out test set** with baseline full-frame inputs (`Resize((224, 224))`):

| Metric | Measured Held-Out Value | Clinical Significance |
| :--- | :--- | :--- |
| **Overall Accuracy** | **71.52%** (113 / 158 correct) | Multi-class balanced benchmark across all 7 classes |
| **Macro-F1 Score** | **72.36%** | Class-balanced harmonic mean |
| **Melanoma (`MEL`) Recall** | **92.0%** (23 / 25 caught) | Primary high-risk safety sensitivity |
| **Melanoma (`MEL`) Precision** | **52.3%** (23 / 44 predicted) | Expected clinical triaging tradeoff (safety-biased) |
| **Actinic Keratosis (`AKIEC`) Recall** | **72.0%** (18 / 25 caught, 75.0% prec) | Pre-malignant lesion sensitivity |
| **Basal Cell Carcinoma (`BCC`) Recall** | **64.0%** (16 / 25 caught, 69.6% prec) | Non-melanoma skin cancer sensitivity |
| **Benign Keratosis (`BKL`) Precision** | **93.3%** (14 / 15 correct, 56.0% rec) | Exceptionally high specificity against keratosis mimics |
| **Dermatofibroma (`DF`) Recall** | **78.6%** (11 / 14 caught, 84.6% prec) | Rare benign lesion sensitivity |
| **Vascular Lesion (`VASC`) Recall** | **100.0%** (19 / 19 caught, 95.0% prec) | Perfect vascular angioma detection |
| **Normal Mole (`NV`) Precision** | **84.6%** (11 / 13 correct, 44.0% rec) | High specificity on normal skin |
| **Average Latency** | **23.52 ms / image** | Instantaneous browser inference |
| **Multi-View TTA Accuracy** | **68.35%** (ECE = 0.0789) | Robust flip-augmented inference |

### ⚠️ Documented Limitations & Clinical Tradeoffs:
1. **Safety-Biased Melanoma Precision (52.3%)**: In accordance with dermatological triaging best practices, the model intentionally accepts a moderate false-positive rate on ambiguous lesions to achieve **92.0% sensitivity on malignant melanomas** (catching 23 of 25 cases).
2. **Modest Test Sample Size**: The held-out test set contains 14–25 physical lesions per category (158 total images); while leak-free and lesion-disjoint, confidence intervals are wider on rare classes (`df`, `vasc`).
3. **Screening Tool, Not a Final Diagnosis**: DermAI is an educational and clinical triaging aid; all diagnostic outputs prompt users to seek in-person dermoscopy and formal histological biopsy.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide React, `@react-pdf/renderer`
- **Backend**: FastAPI, PyTorch 2.x, `timm`, SQLite / SQLAlchemy
- **Report Engine**: Client-side 1-Click PDF export with in-memory scan thumbnail embedding and doctor discussion prompts.

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Unix/MacOS:
source venv/bin/activate

pip install -r requirements.txt

# Start the FastAPI server (Port 8000)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# or for production:
npm run build && npm start
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Testing & Verification

- **Backend PyTest**: `pytest tests/` (Unit and integration tests)
- **Frontend Jest**: `npx jest` (Component rendering & PDF generator tests)
- **Model Evaluation**: `python evaluate_model.py` (Deterministic benchmark on held-out dataset)

---

## 👥 Contributors

- **Nagarjun** ([@nagarjuntm89-png](https://github.com/nagarjuntm89-png)) — Creator & Lead Developer
