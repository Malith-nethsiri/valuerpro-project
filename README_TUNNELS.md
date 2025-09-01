# ValuerPro Public Tunnel Setup

## Current Public URLs

- **Frontend**: https://julie-continue-constructed-need.trycloudflare.com
- **Backend**: https://olympic-stations-this-modification.trycloudflare.com

## Quick Access

- **Health Check**: https://olympic-stations-this-modification.trycloudflare.com/health
- **API Documentation**: https://olympic-stations-this-modification.trycloudflare.com/docs
- **Registration**: https://julie-continue-constructed-need.trycloudflare.com/auth/register
- **Dashboard**: https://julie-continue-constructed-need.trycloudflare.com/dashboard

## Configuration

### Environment Variables
- Frontend uses: `NEXT_PUBLIC_API_URL=https://olympic-stations-this-modification.trycloudflare.com`
- Backend CORS configured for: `https://julie-continue-constructed-need.trycloudflare.com`

### Tunnel Files
- Cloudflared executable: `D:\valuerpro_project\cloudflared.exe`
- Tunnel URLs stored in: `D:\valuerpro_project\.tunnels.env`

### Testing
Run smoke tests with: `npx playwright test smoke-test.spec.js`

## Tunnel Management

### Start Tunnels
```bash
# Backend tunnel (port 8000)
"D:\valuerpro_project\cloudflared.exe" tunnel --url http://localhost:8000

# Frontend tunnel (port 3000) 
"D:\valuerpro_project\cloudflared.exe" tunnel --url http://localhost:3000
```

### Stop Tunnels
Kill the cloudflared processes or use Ctrl+C in terminal

## Notes
- Tunnels are temporary and URLs will change if restarted
- CORS is configured automatically based on PUBLIC_FRONTEND_URL environment variable
- Both services must be running locally for tunnels to work