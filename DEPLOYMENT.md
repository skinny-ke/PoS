# 🚀 Murimi POS - Production Deployment Guide

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18+ (LTS recommended)
- **PostgreSQL**: 14+ (for production database)
- **Redis**: 7+ (for caching and sessions)
- **SSL Certificate**: For HTTPS (required for production)
- **M-Pesa Daraja API**: Sandbox and Production credentials

### External Services
1. **Clerk Authentication**: For user management
2. **Vercel/Railway/Render**: For hosting
3. **Database Provider**: (Supabase, Railway, PlanetScale)
4. **Monitoring**: (Optional - Sentry, LogRocket)

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.local` file in your project root:

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database_name?schema=public"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# M-Pesa Configuration
MPESA_ENVIRONMENT="sandbox" # or "production"
MPESA_CONSUMER_KEY="your_consumer_key"
MPESA_CONSUMER_SECRET="your_consumer_secret"
MPESA_BUSINESS_SHORT_CODE="174379"
MPESA_PASSKEY="your_passkey"
MPESA_AUTH_TOKEN_URL="https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
MPESA_STK_PUSH_URL="https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
MPESA_CALLBACK_URL="https://yourdomain.com/api/mpesa/callback"

# Application
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_NAME="Murimi POS"
NODE_ENV="production"

# Security
ADMIN_HEALTH_TOKEN="your_secure_admin_token"

# Optional: External monitoring
SENTRY_DSN="your_sentry_dsn"
```

### Production Environment Variables

For production deployment, ensure:
- Use production M-Pesa credentials
- Set `MPESA_ENVIRONMENT="production"`
- Use SSL-enabled database URLs
- Configure proper callback URLs

## 🏗️ Deployment Steps

### 1. Database Setup

#### Using Supabase (Recommended)
```bash
# Create new Supabase project
# Get connection string from Supabase dashboard
# Update DATABASE_URL in .env.local
```

#### Using Railway
```bash
# Create new PostgreSQL service
# Get connection string
# Update DATABASE_URL
```

#### Using Traditional PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb murimi_pos
sudo -u postgres createuser murimi_user

# Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE murimi_pos TO murimi_user;"
```

### 2. Initialize Database

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database with initial data
npx tsx prisma/seed.ts
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

#### Option B: GitHub Integration
1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### 4. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL service
railway add postgresql

# Deploy
railway up
```

### 5. Deploy to Render

```bash
# Create new Web Service on Render
# Connect GitHub repository
# Set build command: `npm install && npm run build`
# Set start command: `npm start`
# Add environment variables
```

## 🔒 SSL & Security Configuration

### SSL Certificate Setup
Most hosting providers (Vercel, Railway) handle SSL automatically. For custom servers:

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Security Headers
The application includes security headers by default. Ensure your hosting provider supports:
- HTTPS redirect
- Security headers (CSP, HSTS, etc.)

## 📊 Monitoring & Logging

### Health Checks
Access health check endpoint:
- **Basic**: `GET /api/health`
- **Detailed**: `POST /api/health` with JSON body `{"checkType": "comprehensive"}`

### Performance Monitoring
Monitor these key metrics:
- API response times
- Database query performance  
- Memory usage
- Error rates
- M-Pesa service status

### Logging
Application logs include:
- API request/response times
- Database query performance
- Error tracking
- User activity (audit logs)

## 🔄 CI/CD Pipeline

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Check connection string format
# Ensure SSL is enabled for production
```

#### M-Pesa Integration Issues
- Verify all environment variables
- Check callback URL is accessible
- Ensure business short code is registered
- Verify M-Pesa credentials

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### Performance Issues
- Check health endpoint: `/api/health`
- Monitor response times
- Optimize database queries
- Consider implementing caching

### Logs and Debugging

#### Application Logs
```bash
# View logs in development
npm run dev

# View production logs (Vercel)
vercel logs

# Railway logs
railway logs
```

#### Database Logs
```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Check connection pool
npx prisma studio
```

## 🔧 Maintenance

### Regular Tasks

#### Database Maintenance
```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Vacuum and analyze
npx prisma db execute --file sql/vacuum.sql

# Check for unused indexes
npx prisma db execute --sql "SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;"
```

#### Performance Monitoring
- Monitor `/api/health` endpoint
- Set up alerts for high error rates
- Regular database optimization
- Monitor M-Pesa service status

#### Security Updates
- Keep dependencies updated: `npm update`
- Monitor security advisories
- Regular SSL certificate renewal
- Update M-Pesa credentials when needed

### Backup Strategy

#### Database Backups
```bash
# Automated daily backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backups/backup_$DATE.sql"

# Upload to cloud storage (optional)
aws s3 cp "backups/backup_$DATE.sql" s3://your-backup-bucket/
```

#### Code Backups
- Maintain Git repository
- Tag releases
- Document configurations

## 📞 Support

### System Status
- **Health Check**: `/api/health`
- **Performance Metrics**: `/api/metrics` (Admin only)
- **Database Status**: Check Prisma Studio

### Emergency Procedures

#### M-Pesa Service Outage
1. Switch to cash/card payments
2. Queue offline transactions
3. Monitor service status
4. Resume when service restored

#### Database Issues
1. Check connection status
2. Restart application if needed
3. Restore from backup if necessary
4. Contact database provider support

#### Application Issues
1. Check health endpoint
2. Review application logs
3. Rollback to previous deployment if needed
4. Contact development team

## 🎯 Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrated and seeded
- [ ] SSL certificate installed
- [ ] Health checks passing
- [ ] Security headers configured
- [ ] M-Pesa integration tested
- [ ] Backup strategy implemented
- [ ] Monitoring setup complete

### Post-Deployment
- [ ] Health endpoint responding
- [ ] User authentication working
- [ ] POS transactions functional
- [ ] M-Pesa payments processing
- [ ] Receipt printing working
- [ ] Admin dashboard accessible
- [ ] Offline sync functional
- [ ] Performance metrics acceptable

### Ongoing Monitoring
- [ ] Error rates below 1%
- [ ] Response times under 2 seconds
- [ ] Database queries optimized
- [ ] Memory usage stable
- [ ] Backup schedule maintained
- [ ] Security updates applied