# Security Guidelines - ValuerPro Project

## Environment Configuration

### Required Environment Variables

#### Backend (.env file)
Copy `backend/.env.example` to `backend/.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Security
SECRET_KEY=your-very-secure-secret-key-minimum-64-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Cloud (Optional)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_MAPS_API_KEY=your-maps-api-key

# OpenAI (Optional)  
OPENAI_API_KEY=your-openai-api-key

# AWS (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=your-region
```

#### Frontend (.env.local file)
Copy `frontend/.env.example` to `frontend/.env.local` and configure:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Google Cloud Setup

1. Create a Google Cloud Project
2. Enable Vision API and Maps API
3. Create a Service Account
4. Download credentials JSON file
5. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the file path

**CRITICAL**: Never commit credential files or API keys to version control.

### Security Checklist

- [ ] All `.env*` files are in `.gitignore`
- [ ] No hardcoded API keys in source code
- [ ] Google Cloud credentials stored securely outside repository
- [ ] JWT secret key is cryptographically secure
- [ ] Database credentials use strong passwords
- [ ] CORS settings configured for production domains
- [ ] File upload restrictions properly configured
- [ ] API rate limiting implemented where needed

### Development vs Production

#### Development
- Use localhost URLs
- Keep detailed logging enabled
- Use development API keys if available

#### Production  
- Use HTTPS everywhere
- Set production domain in CORS
- Use production API keys
- Enable security headers
- Configure proper backup procedures
- Monitor for security issues

### Incident Response

If credentials are accidentally exposed:
1. Immediately revoke/rotate all affected keys
2. Check logs for unauthorized access
3. Update all systems with new credentials
4. Review and strengthen security practices

## Contact

For security issues, contact the development team immediately.