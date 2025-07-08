# Deployment Guide

This guide covers deploying the KILT Liquidity Incentive Portal to various hosting platforms.

## 📋 Pre-Deployment Checklist

### Required Environment Variables
```env
# Database (Required for production)
DATABASE_URL=postgresql://username:password@host:5432/database

# Node Environment
NODE_ENV=production

# Optional: Custom Configuration
VITE_APP_NAME=KILT Liquidity Portal
VITE_NETWORK_ID=8453
```

### Build Requirements
- Node.js 18+
- npm or yarn
- PostgreSQL database
- 512MB+ RAM
- 100MB+ storage

## 🚀 Deployment Options

### 1. Vercel (Recommended)

#### Prerequisites
- GitHub repository
- Vercel account
- PostgreSQL database (Neon recommended)

#### Steps
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Configuration
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "client/dist/$1"
    }
  ]
}
```

### 2. Netlify

#### Build Settings
```bash
# Build command
npm run build

# Publish directory
dist/public

# Functions directory
netlify/functions
```

#### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "dist/public"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. Railway

#### Steps
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

#### railway.json
```json
{
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "sleepApplication": false,
    "numReplicas": 1
  }
}
```

### 4. Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/kilt_lp
    depends_on:
      - db
    
  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=kilt_lp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 🗄️ Database Setup

### Neon Database (Recommended)
```bash
# Create account at neon.tech
# Create new project
# Copy connection string

# Set environment variable
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Run migrations
npm run db:push
```

### Self-Hosted PostgreSQL
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb kilt_lp

# Create user
sudo -u postgres createuser --interactive

# Set password
sudo -u postgres psql -c "ALTER USER username PASSWORD 'password';"

# Run migrations
npm run db:push
```

## 🔧 Configuration

### Environment Variables by Platform

#### Vercel
```bash
# Add via Vercel dashboard or CLI
vercel env add DATABASE_URL
vercel env add NODE_ENV
```

#### Netlify
```bash
# Add via Netlify dashboard
# Site settings > Environment variables
```

#### Railway
```bash
# Add via Railway dashboard
# Variables section
```

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Production start
npm start

# Database operations
npm run db:push
npm run db:studio
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache
npm run clean
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+

# Check TypeScript
npx tsc --version
```

#### Database Connection Issues
```bash
# Test connection
npm run db:studio

# Check environment variable
echo $DATABASE_URL

# Verify SSL settings
# Add ?sslmode=require for production
```

#### Memory Issues
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096"

# Check build output size
du -sh dist/
```

### Performance Optimization

#### Frontend
- Enable gzip compression
- Configure CDN caching
- Optimize images
- Enable tree shaking

#### Backend
- Connection pooling
- Query optimization
- Caching headers
- Error monitoring

## 📊 Monitoring

### Recommended Tools
- **Vercel Analytics**: Built-in monitoring
- **Sentry**: Error tracking
- **Datadog**: Application monitoring
- **New Relic**: Performance monitoring

### Health Checks
```bash
# API health
curl https://your-domain.com/api/health

# Database health
curl https://your-domain.com/api/db-health

# Frontend health
curl https://your-domain.com/
```

## 🔒 Security

### SSL/TLS
- Enable HTTPS
- Configure security headers
- Set up Content Security Policy
- Enable HSTS

### Environment Security
- Use environment variables for secrets
- Enable database SSL
- Configure CORS properly
- Set up rate limiting

## 📈 Scaling

### Horizontal Scaling
- Load balancer configuration
- Database read replicas
- CDN setup
- Caching layer

### Vertical Scaling
- Memory optimization
- CPU optimization
- Database optimization
- Bundle size reduction

## 🔄 CI/CD

### GitHub Actions
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review platform-specific documentation
3. Contact platform support
4. File an issue in the repository

---

Happy deploying! 🚀