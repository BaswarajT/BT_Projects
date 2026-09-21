# ProjectIQ

A Zoho Projects–style project-management app: Django REST Framework + PostgreSQL backend,
React + TypeScript + Tailwind frontend, JWT auth, Redis/Celery for background jobs.

## What's already done

- Backend (`backend/`): custom `User` model, `Project`/`ProjectMember`/`Milestone`,
  `Task`/`TaskDependency`/`TimeEntry`, `Comment`, `Notification`, `Attachment` models,
  serializers, permission-scoped ViewSets, JWT auth (register/login/refresh), a
  dashboard-summary endpoint (open/completed/overdue/blocked task counts, per-project
  progress, team workload, upcoming milestones), search/filter/ordering, Celery config,
  and a Django test suite (`python manage.py test` — 5/5 passing against SQLite in this
  sandbox).
- Frontend (`frontend/`): Vite + React 18 + TypeScript + Tailwind, React Router, TanStack
  Query, an Axios client with JWT refresh, auth context + route guard, Login/Register,
  a full project-management Dashboard (stat cards, per-project progress bars, team
  workload chart, upcoming milestones), Projects (list + create), Project details (task
  list + create), Tasks (search/filter), and a drag-and-drop Kanban board.

## Tools missing on the machine this was scaffolded on

This was built in a sandboxed environment that only had Python installed — **Node/npm,
git, PostgreSQL, and Docker were not available**, so none of the following were run here:
`npm install`, `npm run dev`, `git init`, `python manage.py migrate` against a real
database, or `docker compose up`. Install these locally before running the app:

- [Node.js LTS](https://nodejs.org/) (includes npm)
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/download/) + pgAdmin (or use the included
  `docker-compose.yml`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional, for Postgres/Redis)

The backend's Python packages (Django, DRF, psycopg, Celery, etc.) were installed and the
full test suite was verified to pass in this sandbox.

## Run it locally

### 1. Database

Either install PostgreSQL locally and create the database/user:

```sql
CREATE DATABASE projectiq;
CREATE USER projectiq_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE projectiq TO projectiq_user;
\c projectiq
GRANT ALL ON SCHEMA public TO projectiq_user;
ALTER SCHEMA public OWNER TO projectiq_user;
```

or start it with Docker:

```bash
docker compose up -d db redis
```

Update `backend/.env` if you change the database name/user/password.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Register an account, create a
project, add a task, drag it across the Kanban board, then refresh the page and check
PostgreSQL (or Django Admin at `http://127.0.0.1:8000/admin/`) to confirm it persisted.

### 4. Celery (optional, needs Redis running)

```bash
cd backend
.venv\Scripts\Activate.ps1
celery -A config worker --loglevel=info
```

## Git

Git wasn't available in the sandbox, so no repository was initialized. Run this from the
`projectiq/` folder once you have git installed:

```bash
git init
git add .
git commit -m "Initial ProjectIQ application"
```

## Next steps

Members management UI, comments UI, milestones UI, notifications UI, file upload UI, and
calendar/time-tracking UI are backed by working APIs (see `backend/config/urls.py`) but
don't have frontend pages yet — build those next, then move on to Docker, CI/CD, and the
optional ML risk-prediction / RAG assistant features.
