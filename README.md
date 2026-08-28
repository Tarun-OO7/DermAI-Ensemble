# Medical Diagnostic Web Application

An AI-powered web application for early detection of Skin, Breast, and Lung cancer.

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, TypeScript
- **Backend**: FastAPI, SQLAlchemy, SQLite/PostgreSQL
- **AI/ML Engine**: PyTorch

## Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Unix/MacOS:
# source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

**Environment Variables (`backend/.env`)**:
- `DATABASE_URL`: Defaults to local SQLite (`sqlite:///./medical_diagnostic.db`)
- `USE_GPU`: `true` to use CUDA, `false` for CPU (default)
- `HF_REPO_ID` and `HF_FILENAME`: For downloading model weights on startup

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The application will be available at `http://localhost:3000`.
