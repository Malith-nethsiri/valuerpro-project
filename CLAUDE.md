# ValuerPro – Project Memory (for Claude)

Source of truth: ./plan.md  ← Read this file first. Follow it unless I say otherwise.

Non-negotiables
- Monorepo: /backend (FastAPI) + /frontend (Next.js 14 App Router, TS, Tailwind)
- DB: PostgreSQL + SQLAlchemy + Alembic
- Auth: JWT, secure cookies (frontend), CORS handled
- File uploads + OCR pipeline (stub ok first), AI endpoints (stubs ok first)
- Exports: /reports/{id}/generate-pdf and /reports/{id}/generate-docx (implement later; stub now)
- No payments for now
- Local dev uses Docker Compose (db), frontend on 3000, backend on 8000

Dev rules
- Use .env files (no secrets in code)
- Ask before deleting files; otherwise proceed autonomously
- Prefer clear, typed, testable code; add comments where non-obvious
- Make small commits with good messages
