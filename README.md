# BT Projects

A multi-tenant project delivery and sales platform: Django REST Framework backend,
React + TypeScript + Tailwind frontend, JWT auth. Every company's data — projects,
tasks, timesheets, clients, deals — is isolated from every other company's, enforced
at the API layer.

## Feature overview

**Access & multi-tenancy**
- Company-scoped data isolation across every module, enforced server-side (never just hidden in the UI)
- 3-tier admin hierarchy — Global Admin (platform-wide), Super Admin (full company control), Admin (company-wide visibility, no user management) — plus Sales Manager, Project Manager, Salesperson, Team Lead, Member, Client, Viewer
- JWT auth with refresh, OTP-based email/phone verification
- Recycle Bin (soft delete + restore) for Users and Projects

**Delivery**
- Projects — a full PMO tracker: PO tracking, LOB/project group, PMO owner, sales person, budget/PO value, categories, billing entity, comments, and more. Auto-generated `PR-####` project codes, one independent sequence per company. Configurable table columns, rich filtering (status, PMO, LOB, client, date range), CSV/Excel export
- Tasks, subtask dependencies, Kanban board, Milestones
- Timesheet + Resource Utilization/Bench reporting, Project Overrun reporting

**Sales**
- Clients, with live deal/revenue/active-project stats
- Sales Projects — the single source of truth for every opportunity
- Deals — a drag-and-drop Kanban pipeline view over that same data
- Sales Team performance dashboard (pipeline, win rate, target achievement)
- "Convert to Project" turns a Won deal into a real delivery project

**Everywhere**
- Comments, notifications, file attachments
- Company-scoped admin Users page: search, role management, Recycle Bin

## Tech stack

- **Backend:** Django 5, Django REST Framework, SimpleJWT, django-filter, Celery + Redis (optional background jobs), openpyxl (Excel export), PostgreSQL in production / SQLite for local dev
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Axios

## Run it locally

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env       # macOS/Linux: cp .env.example .env
```

Edit `backend/.env` — for local dev the quickest path is SQLite:

```
DB_ENGINE=sqlite
```

Then:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

To run against PostgreSQL instead, either install it locally or start it with Docker
(`docker compose up -d db redis`), set `DB_ENGINE=postgresql` and the `DB_*` variables
in `.env`, and run the same `migrate`/`runserver` steps.

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env       # macOS/Linux: cp .env.example .env
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### 3. Tests

```bash
cd backend
python manage.py test
```

```bash
cd frontend
npx tsc -b
```

## Deployment

The backend is production-ready for a platform like [PythonAnywhere](https://www.pythonanywhere.com/)
(whitenoise for static files, env-driven `ALLOWED_HOSTS`/`CORS_ALLOWED_ORIGINS`,
PostgreSQL support). The frontend deploys cleanly to [Vercel](https://vercel.com/) —
set `VITE_API_URL` there to the deployed backend's URL.

## Project structure

```
backend/    Django project — one app per domain (users, companies, projects, tasks,
            sales, clients, comments, notifications, files, reports)
frontend/   Vite + React app — pages/, components/, services/ (API clients), types/
```
