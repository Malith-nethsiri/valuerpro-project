# ValuerPro - AI-Powered Property Valuation Report System

A modern monorepo containing a FastAPI backend and Next.js frontend for generating professional property valuation reports with AI assistance.

## Architecture

- **Backend**: FastAPI (Python 3.11+) with PostgreSQL, SQLAlchemy, Alembic, JWT auth
- **Frontend**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, Axios
- **Database**: PostgreSQL 16 (via Docker)
- **AI Integration**: OpenAI API, Google Cloud Vision API, Google Maps API

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd valuerpro_project
```

### 2. Start Database

```bash
# Start PostgreSQL database
docker compose up -d db

# Optional: Start pgAdmin for database management
docker compose up -d pgadmin
# Access pgAdmin at http://localhost:5050 (admin@valuerpro.com / admin)
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
pip install -e .

# Copy environment file and configure
cp .env.example .env
# Edit .env with your database URL and API keys

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --port 8000
```

Backend will be available at: http://localhost:8000
API documentation: http://localhost:8000/docs

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.local.example .env.local
# Edit .env.local with your API URL

# Start frontend server
npm run dev
```

Frontend will be available at: http://localhost:3000

## Development Scripts

### Makefile Commands

```bash
# Start database only
make dev:db

# Start backend (database must be running)
make dev:backend

# Start frontend
make dev:frontend

# Start all services
make dev:all

# Stop all services
make stop

# Clean up
make clean
```

### Manual Commands

#### Backend Commands
```bash
cd backend

# Install dependencies
pip install -e .

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Migration name"

# Start development server
uvicorn app.main:app --reload --port 8000

# Run tests (if available)
pytest
```

#### Frontend Commands
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/valuerpro

# Security
SECRET_KEY=your-very-secure-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=["http://localhost:3000"]

# Optional: AI APIs
OPENAI_API_KEY=your-openai-api-key
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_MAPS_API_KEY=your-maps-api-key
```

### Frontend (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Reports
- `GET /api/v1/reports/` - List reports
- `POST /api/v1/reports/` - Create report
- `GET /api/v1/reports/{id}` - Get report
- `PUT /api/v1/reports/{id}` - Update report
- `DELETE /api/v1/reports/{id}` - Delete report
- `GET /api/v1/reports/{id}/generate-pdf` - Generate PDF (stub)
- `GET /api/v1/reports/{id}/generate-docx` - Generate DOCX (stub)

### Uploads (Stubs)
- `POST /api/v1/uploads/single` - Upload single file
- `POST /api/v1/uploads/multiple` - Upload multiple files

### AI Services (Stubs)
- `POST /api/v1/ai/ocr` - OCR processing
- `POST /api/v1/ai/translate` - Text translation
- `POST /api/v1/ai/parse` - Document parsing

## Database Schema

### Users Table
- `id` (UUID, PK)
- `email` (String, unique)
- `hashed_password` (String)
- `full_name` (String)
- `title` (String, optional)
- `qualifications` (String, optional)
- `panel_memberships` (String, optional)
- `business_address` (Text, optional)
- `contact_numbers` (String, optional)
- `is_active` (Boolean)
- `created_at`, `updated_at` (DateTime)

### Reports Table
- `id` (UUID, PK)
- `title` (String)
- `reference_number` (String, unique)
- `status` (String: draft/in_review/completed)
- `property_address` (Text, optional)
- `data` (JSON - flexible report content)
- `author_id` (UUID, FK to users)
- `created_at`, `updated_at` (DateTime)

## Features Implemented

✅ **Core Infrastructure**
- FastAPI backend with JWT authentication
- Next.js frontend with TypeScript
- PostgreSQL database with Alembic migrations
- Docker Compose for local development
- CORS configuration

✅ **Authentication System**
- User registration and login
- JWT token-based authentication
- Protected routes and API endpoints

✅ **Basic Report Management**
- CRUD operations for reports
- User-specific data isolation
- Status tracking (draft/in_review/completed)

✅ **UI Components**
- Landing page with feature highlights
- Login/Register forms
- Dashboard with user profile and reports list
- Responsive design with Tailwind CSS

## Features to Implement

🚧 **AI Integration**
- OCR processing with Google Cloud Vision
- Document parsing with OpenAI API
- Sinhala to English translation
- Auto-populate report fields from uploaded documents

🚧 **Report Builder**
- Dynamic form interface for report creation
- Property details, boundaries, valuation tables
- Photo uploads and management
- Maps integration with Google Maps API

🚧 **Document Generation**
- PDF export with professional formatting
- DOCX export for further editing
- Invoice generation
- Email delivery

🚧 **Advanced Features**
- File upload handling
- Real-time collaboration
- Audit logging
- Data backup and recovery

## Deployment

### Local Development
Follow the Quick Start guide above.

### Production Deployment
1. Set up production database (PostgreSQL)
2. Configure environment variables with production values
3. Build frontend: `cd frontend && npm run build`
4. Deploy backend with proper WSGI server (e.g., Gunicorn)
5. Serve frontend with reverse proxy (e.g., Nginx)
6. Set up SSL/TLS certificates
7. Configure monitoring and logging

### Environment Variables for Production
- Use strong, randomly generated SECRET_KEY
- Set secure DATABASE_URL with production credentials
- Configure real API keys for AI services
- Set ALLOWED_ORIGINS to production domains
- Enable HTTPS and secure cookie settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For technical support or questions, please contact the development team.