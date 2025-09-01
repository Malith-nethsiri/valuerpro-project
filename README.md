# ValuerPro - AI-Powered Property Valuation System

A comprehensive AI-powered property valuation report generation system designed for certified property valuers in Sri Lanka.

## 🚀 Features

- **15-Step Comprehensive Wizard**: Complete valuation workflow from property identification to final report
- **AI Document Analysis**: Automated data extraction from survey plans, deeds, and valuation documents
- **Environmental Assessment**: NBRO clearance, climate factors, and environmental impact analysis
- **Market Analysis**: Comparable sales analysis with adjustment factors and market trends
- **Transport Evaluation**: Road access, public transport, and connectivity assessment
- **Google Maps Integration**: Location intelligence, routing, and amenities detection
- **Professional Reports**: PDF and DOCX generation with customizable templates
- **Regulatory Compliance**: Built-in checks for local planning and zoning requirements

## 🏗️ Architecture

**Frontend**: Next.js 14 • TypeScript • Tailwind CSS • React Context  
**Backend**: FastAPI • PostgreSQL • SQLAlchemy • Alembic  
**AI Services**: Google Cloud Vision API • OpenAI GPT-4o  
**Maps**: Google Maps API • Distance Matrix • Places API

## ⚡ Quick Start

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.11+ and pip  
- PostgreSQL 15+
- Google Cloud account with Vision API enabled

### 2. Environment Setup
```bash
# Backend
cd backend
cp .env.example .env
# Configure database URL, API keys in .env

# Frontend  
cd frontend
cp .env.local.example .env.local
# Configure API URLs in .env.local
```

### 3. Database Setup
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### 4. Start Services
```bash
# Backend (Terminal 1)
cd backend && python -m app.main

# Frontend (Terminal 2)  
cd frontend && npm install && npm run dev
```

**Access**: http://localhost:3000 (Frontend) | http://localhost:8000/docs (API)

## 📁 Project Structure

```
valuerpro_project/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/endpoints/   # API routes (auth, reports, ocr, maps)
│   │   ├── services/           # Business logic (AI, maps, validation)
│   │   ├── models.py          # Database models
│   │   └── schemas.py         # API schemas
│   └── alembic/              # Database migrations
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   ├── components/wizard/  # 15-step wizard components
│   │   ├── lib/              # API client, utilities
│   │   └── types/            # TypeScript definitions
│   └── public/              # Static assets
├── CLAUDE.md               # Development instructions
├── PRIVACY_POLICY.md       # Privacy policy
├── SECURITY.md            # Security guidelines
└── TERMS_OF_SERVICE.md    # Terms of service
```

## 🎯 Key Workflow

1. **User Authentication**: Secure registration and login for certified valuers
2. **Report Creation**: 15-step wizard covering all valuation aspects
3. **Document Upload**: AI-powered extraction from property documents
4. **Data Population**: Smart auto-filling across all wizard steps
5. **Market Analysis**: Comparable sales research and adjustment factors
6. **Environmental Check**: NBRO clearance and environmental assessments
7. **Report Generation**: Professional PDF/DOCX outputs

## 🔒 Security & Compliance

- JWT-based authentication with secure cookies
- Input validation and sanitization
- Rate limiting and CORS protection
- Secure file upload handling
- GDPR-compliant data processing

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (when running)
- **Privacy Policy**: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Terms**: [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md)

## 🚀 Production Deployment

Use the provided Docker Compose files:

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

Ensure environment variables are properly configured for production use.

---

**Built for professional property valuers** • **AI-powered efficiency** • **Regulatory compliant**