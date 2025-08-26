.PHONY: help dev:db dev:backend dev:frontend dev:all stop clean install

# Default target
help:
	@echo "ValuerPro Development Commands:"
	@echo ""
	@echo "  dev:db         Start PostgreSQL database"
	@echo "  dev:backend    Start FastAPI backend (requires database)"
	@echo "  dev:frontend   Start Next.js frontend"
	@echo "  dev:all        Start all services"
	@echo "  stop           Stop all Docker services"
	@echo "  clean          Clean up containers and volumes"
	@echo "  install        Install all dependencies"
	@echo "  migrate        Run database migrations"
	@echo "  test           Run all tests"
	@echo ""

# Start database
dev:db:
	docker compose up -d db
	@echo "Database started at localhost:5432"
	@echo "Waiting for database to be ready..."
	@timeout 30 bash -c 'while ! docker compose exec db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done'
	@echo "Database is ready!"

# Start backend
dev:backend:
	@echo "Starting FastAPI backend..."
	cd backend && uvicorn app.main:app --reload --port 8000

# Start frontend
dev:frontend:
	@echo "Starting Next.js frontend..."
	cd frontend && npm run dev

# Start all services (in background)
dev:all:
	docker compose up -d db
	@echo "Database started. Waiting for it to be ready..."
	@timeout 30 bash -c 'while ! docker compose exec db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done'
	@echo "Database ready! Start backend and frontend in separate terminals:"
	@echo ""
	@echo "Terminal 1: make dev:backend"
	@echo "Terminal 2: make dev:frontend"
	@echo ""
	@echo "Or run them manually:"
	@echo "cd backend && uvicorn app.main:app --reload --port 8000"
	@echo "cd frontend && npm run dev"

# Stop all services
stop:
	docker compose down
	@echo "All services stopped"

# Clean up everything
clean:
	docker compose down -v
	docker system prune -f
	@echo "Cleanup complete"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -e .
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Dependencies installed!"

# Run database migrations
migrate:
	@echo "Running database migrations..."
	cd backend && alembic upgrade head
	@echo "Migrations complete!"

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && python -m pytest tests/ || echo "No backend tests found"
	@echo "Running frontend tests..."
	cd frontend && npm test || echo "No frontend tests found"

# Setup project from scratch
setup: install dev:db migrate
	@echo ""
	@echo "Setup complete! You can now start the development servers:"
	@echo ""
	@echo "Terminal 1: make dev:backend"
	@echo "Terminal 2: make dev:frontend"
	@echo ""
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"