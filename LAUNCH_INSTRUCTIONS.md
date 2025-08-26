# 🚀 ValuerPro Launch Instructions

## Prerequisites

Before launching ValuerPro, ensure you have:

- **Docker** and **Docker Compose** installed
- **Git** installed  
- **Node.js 18+** and **Python 3.11+** (for development)
- **PostgreSQL 16** (or use Docker container)

## 🎯 Launch Options

### Option 1: Quick Development Launch (Recommended for Testing)

#### Step 1: Clone and Setup
```bash
# Clone the repository
git clone https://github.com/Malith-nethsiri/valuerpro-project.git
cd valuerpro-project

# Start the database
docker compose up -d db
```

#### Step 2: Backend Setup
```bash
cd backend

# Install Python dependencies
pip install -e .

# Create environment file
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use your preferred editor

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --port 8000
```

#### Step 3: Frontend Setup (New Terminal)
```bash
cd frontend

# Install Node.js dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local file
nano .env.local  # or use your preferred editor

# Start frontend server
npm run dev
```

#### Step 4: Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

### Option 2: Production Launch with Docker

#### Step 1: Environment Configuration
```bash
# Clone repository
git clone https://github.com/Malith-nethsiri/valuerpro-project.git
cd valuerpro-project

# Create production environment file
cp .env.example .env.production

# Edit production settings
nano .env.production
```

#### Step 2: Required Environment Variables
Edit `.env.production` with your production values:

```env
# Database
POSTGRES_DB=valuerpro
POSTGRES_USER=postgres  
POSTGRES_PASSWORD=your-secure-database-password

# Security (CRITICAL - Generate strong values)
SECRET_KEY=your-very-secure-secret-key-64-characters-minimum
NEXTAUTH_SECRET=your-nextauth-secret-key

# URLs
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXTAUTH_URL=https://yourdomain.com
ALLOWED_ORIGINS=["https://yourdomain.com"]

# Optional: AI Services (for full functionality)
OPENAI_API_KEY=your-openai-api-key
GOOGLE_CLOUD_PROJECT_ID=your-google-project-id
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Monitoring (Optional)
GRAFANA_PASSWORD=your-grafana-password
SLACK_WEBHOOK_URL=your-slack-webhook
```

#### Step 3: Deploy with Docker
```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh deploy production
```

#### Step 4: Access Production Application
- **Application:** https://yourdomain.com
- **Monitoring:** http://yourdomain.com:3001 (Grafana)
- **Health Check:** https://yourdomain.com/health

### Option 3: Enterprise Kubernetes Deployment

#### Step 1: Kubernetes Prerequisites
```bash
# Ensure you have kubectl and helm installed
kubectl version
helm version

# Create namespace
kubectl create namespace valuerpro
```

#### Step 2: Deploy with Kubernetes
```bash
# Apply Kubernetes manifests (you'll need to create these)
kubectl apply -f k8s/ -n valuerpro

# Or use Helm chart (if created)
helm install valuerpro ./helm-chart -n valuerpro
```

## 🔧 Configuration Guide

### Required Configurations

#### 1. Database Setup
```sql
-- Create database user and permissions
CREATE DATABASE valuerpro;
CREATE USER valuerpro_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE valuerpro TO valuerpro_user;
```

#### 2. SSL/TLS Setup (Production)
```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d yourdomain.com

# Or manually place certificates in nginx/ssl/
# - yourdomain.com.crt
# - yourdomain.com.key
```

#### 3. Nginx Configuration
Create `nginx/nginx.conf`:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;
    
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://frontend:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Optional Configurations

#### 1. Google Cloud Setup (for AI features)
```bash
# Create service account and download JSON key
gcloud iam service-accounts create valuerpro-service
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:valuerpro-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/vision.admin"

# Download and secure the key file
gcloud iam service-accounts keys create ./secrets/google-cloud-key.json \
    --iam-account=valuerpro-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### 2. OpenAI API Setup
```bash
# Get API key from OpenAI dashboard
# Add to environment variables
export OPENAI_API_KEY="sk-your-openai-api-key"
```

## 🧪 Testing the Launch

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Frontend health  
curl http://localhost:3000/api/health

# Database connectivity
docker exec valuerpro_db pg_isready -U postgres
```

### Smoke Tests
```bash
# Test user registration
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","full_name":"Test User"}'

# Test report creation (after authentication)
curl -X GET http://localhost:8000/api/v1/reports/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Frontend Tests
```bash
cd frontend

# Run unit tests
npm test

# Run E2E tests (if configured)
npm run test:e2e

# Check accessibility
npm run test:a11y
```

## 📊 Monitoring Setup

### Access Monitoring Dashboard
- **Grafana:** http://localhost:3001
  - Username: admin
  - Password: (from GRAFANA_PASSWORD env var)

### Key Metrics to Monitor
- **Application Health:** HTTP response times, error rates
- **Database Performance:** Query times, connection pool
- **Resource Usage:** CPU, memory, disk space
- **Business Metrics:** User registrations, reports generated

## 🔒 Security Checklist

Before launching in production:

- [ ] **Environment Variables:** All secrets properly configured
- [ ] **SSL/TLS:** HTTPS enabled with valid certificates  
- [ ] **Database:** Secure passwords, network isolation
- [ ] **Firewall:** Only necessary ports exposed
- [ ] **Backups:** Automated backup system configured
- [ ] **Monitoring:** Security alerts configured
- [ ] **Updates:** System and dependencies up to date

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database status
docker logs valuerpro_db

# Verify connection string
psql "postgresql://postgres:password@localhost:5432/valuerpro"
```

#### Frontend Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### API Endpoints Not Working
```bash
# Check backend logs
docker logs valuerpro_backend

# Verify environment variables
env | grep SECRET_KEY
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /path/to/cert.crt -text -noout

# Test SSL configuration
curl -I https://yourdomain.com
```

### Getting Help

1. **Check logs:** All services log to stdout/stderr
2. **Health endpoints:** Use `/health` endpoints for diagnostics
3. **Documentation:** Refer to API docs at `/docs`
4. **Issues:** Report problems on GitHub repository

## 🎯 Launch Checklist

### Pre-Launch (Development)
- [ ] Clone repository successfully
- [ ] Database running and accessible
- [ ] Backend API responding on port 8000
- [ ] Frontend loading on port 3000
- [ ] User registration working
- [ ] Report creation working
- [ ] File upload working

### Production Launch
- [ ] Domain name configured and DNS pointing to server
- [ ] SSL certificates installed and working
- [ ] Environment variables securely configured
- [ ] Database backup system active
- [ ] Monitoring dashboards accessible
- [ ] Security scanning completed
- [ ] Performance testing completed
- [ ] Team training completed

### Post-Launch
- [ ] User registration and onboarding tested
- [ ] Professional user feedback collected
- [ ] Performance metrics monitored
- [ ] Security alerts configured
- [ ] Support procedures activated
- [ ] Marketing campaigns initiated

## 📞 Support

For technical support during launch:
- **Documentation:** Check README.md and API docs
- **Issues:** Create GitHub issues for bugs
- **Security:** Contact security@valuerpro.com for security issues
- **Business:** Contact support@valuerpro.com for business inquiries

---

**Launch Status:** Ready for deployment  
**Estimated Launch Time:** 2-4 hours (development), 4-8 hours (production)  
**Support Level:** Enterprise-grade with comprehensive documentation