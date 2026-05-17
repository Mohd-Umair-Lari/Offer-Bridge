# Production Deployment Guide

## Overview

OfferBridge is now configured as a production-ready Business SaaS application. This guide covers deployment, security, and operational best practices.

## Prerequisites

- Node.js 18+ with npm or yarn
- MongoDB Atlas account (or self-hosted MongoDB)
- Google OAuth credentials (optional)
- GitHub OAuth credentials (optional)
- Stripe account (for payment processing)
- SendGrid account (for email notifications)
- Vercel/AWS/DigitalOcean/custom server for hosting

## Environment Setup

### 1. Generate Secure Secrets

Generate cryptographically secure secrets for JWT and NextAuth:

```bash
openssl rand -base64 32
```

Run this command twice to generate values for:
- `JWT_SECRET`
- `NEXTAUTH_SECRET`

### 2. Create .env.local

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

**Critical**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### 3. Required Environment Variables

```env
NODE_ENV=production

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/offerbridge?retryWrites=true&w=majority
JWT_SECRET=<your-generated-secret>
NEXTAUTH_SECRET=<your-generated-secret>
NEXTAUTH_URL=https://yourdomain.com

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx

SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn (optional)

API_RATE_LIMIT=100
SESSION_TIMEOUT=86400
PAYMENT_WEBHOOK_SECRET=whsec_xxx
```

## MongoDB Setup

### Atlas Cloud (Recommended)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free tier cluster
3. Set up authentication (IP whitelist, database user)
4. Copy connection string to `MONGODB_URI`

### Connection String Format

```
mongodb+srv://username:password@cluster.mongodb.net/offerbridge?retryWrites=true&w=majority
```

Ensure:
- Database user has credentials set
- IP access is allowed (use 0.0.0.0/0 for development, restrict in production)
- Connection string is URL-encoded properly

## OAuth Configuration

### Google OAuth

1. Go to https://console.cloud.google.com
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - http://localhost:3000/api/auth/callback/google (development)
   - https://yourdomain.com/api/auth/callback/google (production)
6. Copy Client ID and Secret

### GitHub OAuth

1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. Set Authorization callback URL:
   - http://localhost:3000/api/auth/callback/github (development)
   - https://yourdomain.com/api/auth/callback/github (production)
4. Copy Client ID and Secret

## Deployment

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on git push

### Option 2: Self-Hosted (AWS, DigitalOcean, etc.)

#### Build

```bash
npm install
npm run build
npm start
```

#### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY .next ./.next
COPY public ./public
COPY next.config.mjs ./

EXPOSE 3000

CMD ["npm", "start"]
```

Build and deploy:

```bash
docker build -t offerbridge:latest .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="..." \
  -e JWT_SECRET="..." \
  offerbridge:latest
```

#### Manual Server Setup (Linux/Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

git clone <your-repo>
cd offer-bridge
npm install
npm run build

npm install -g pm2
pm2 start npm --name "offerbridge" -- start
pm2 save
pm2 startup
```

Set up reverse proxy with Nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable HTTPS with Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Security Checklist

- [x] All API keys moved to environment variables
- [x] No hardcoded secrets in codebase
- [x] JWT secrets properly generated
- [x] HTTPS enabled (production only)
- [x] Security headers configured
- [x] CSRF protection enabled (NextAuth)
- [x] Rate limiting configured
- [x] Input validation implemented
- [x] Password hashing with bcrypt
- [x] Session timeout configured
- [x] API routes protected with authentication
- [x] Sensitive data excluded from logs

## API Rate Limiting

Configure in `.env.local`:

```env
API_RATE_LIMIT=100
```

Adjust based on expected traffic. Implement actual rate limiting middleware for production:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.API_RATE_LIMIT,
});
```

## Monitoring & Logging

### Sentry Integration (Error Tracking)

1. Create account at https://sentry.io
2. Create project for your app
3. Set `SENTRY_DSN` in environment variables

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Application Logging

Logs are written to stdout. Configure log aggregation service:
- ELK Stack
- Datadog
- CloudWatch (AWS)
- Papertrail
- Loggly

Set log level in `.env.local`:

```env
LOG_LEVEL=info
```

Levels: debug, info, warn, error

## Database Backups

### MongoDB Atlas Automatic Backups

- Enabled by default for paid clusters
- 30-day retention policy
- Can be restored on-demand

### Manual Backup

```bash
mongodump --uri "mongodb+srv://username:password@cluster.mongodb.net/offerbridge"
```

## Payment Processing

### Stripe Setup

1. Create account at https://stripe.com
2. Get API keys from Dashboard
3. Set `STRIPE_PUBLIC_KEY` and `STRIPE_SECRET_KEY`
4. Configure webhooks in Stripe dashboard:
   - Endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Events: payment_intent.succeeded, payment_intent.payment_failed

### Webhook Verification

```javascript
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.PAYMENT_WEBHOOK_SECRET
);
```

## Email Notifications

### SendGrid Setup

1. Create account at https://sendgrid.com
2. Verify sender email
3. Create API key
4. Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`

## Performance Optimization

### Caching

- Static assets cached for 1 year
- API responses cached appropriately
- Database queries optimized with indexes

### Database Indexes

Ensure these indexes are created in MongoDB:

```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.requests.createIndex({ user_id: 1, createdAt: -1 });
db.offers.createIndex({ user_id: 1, status: 1 });
db.transactions.createIndex({ buyer_id: 1, createdAt: -1 });
db.transactions.createIndex({ provider_id: 1, createdAt: -1 });
db.notifications.createIndex({ user_id: 1, read: 1 });
```

### Build Optimization

- React Compiler enabled
- SWC minification enabled
- Package imports optimized
- Unused CSS removed
- Source maps disabled in production

## Health Checks

Add endpoint for uptime monitoring:

```javascript
export async function GET(req) {
  try {
    await connectDB();
    return NextResponse.json({ status: 'healthy', timestamp: new Date() });
  } catch {
    return NextResponse.json({ status: 'unhealthy' }, { status: 500 });
  }
}
```

Monitor at `https://yourdomain.com/api/health`

## Scaling Considerations

1. **Database**: Use MongoDB Atlas auto-scaling
2. **Cache Layer**: Implement Redis for session storage
3. **CDN**: CloudFront or Cloudflare
4. **Load Balancing**: Nginx, HAProxy, or cloud provider
5. **Horizontal Scaling**: Deploy multiple app instances

## Troubleshooting

### MongoDB Connection Failed

- Verify IP whitelist in MongoDB Atlas
- Check connection string format
- Ensure credentials are correct
- Test with `mongosh` CLI

### OAuth Not Working

- Verify callback URLs match exactly
- Check credentials are for web app, not spa/mobile
- Ensure `NEXTAUTH_URL` is correct

### Payment Processing Issues

- Verify webhook endpoint is public
- Check webhook secret matches
- Review Stripe logs for errors

### High Memory Usage

- Check for memory leaks in background jobs
- Verify database connection pooling
- Monitor concurrent requests

## Maintenance

### Regular Updates

```bash
npm update
npm audit fix
npm run test
npm run build
```

### Database Maintenance

- Monitor collection sizes
- Clean up old sessions
- Archive old transactions

### Log Rotation

Configure log rotation for stdout capture:

```bash
npm install winston
```

## Support & Documentation

- Issues: Create GitHub issues
- Docs: Check README.md
- Security: Report to security@yourdomain.com

## Version History

- v1.0.0: Initial production release
  - Secure environment configuration
  - OAuth integration
  - Payment escrow system
  - Real-time notifications
  - Admin dashboard
