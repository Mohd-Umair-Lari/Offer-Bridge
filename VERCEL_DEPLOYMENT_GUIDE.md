# Vercel Deployment Guide - OfferBridge

## Build Issues Fixed

### 1. ✅ Deprecated `swcMinify` Option Removed
- **Issue**: Next.js 16 no longer supports `swcMinify` config option
- **Fix**: Removed from `next.config.mjs`
- **Status**: Build will no longer show the "Unrecognized key(s)" warning

### 2. ✅ Environment Variables Build-Safe
- **Issue**: Build failed when required env vars were missing
- **Fix**: Added smart detection to skip validation during build phase, provide safe defaults
- **Status**: Build succeeds even without env vars; runtime validation ensures they're present when needed

## Required Environment Variables for Vercel

**You MUST set these in your Vercel project settings:**

### Database
- `MONGODB_URI` - MongoDB connection string (mongodb+srv://user:pass@cluster.mongodb.net/dbname)

### Authentication & Security
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production domain (https://yourdomain.com or https://offerbridge.vercel.app)

### OAuth (Optional but Recommended)
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GITHUB_CLIENT_ID` - From GitHub OAuth App
- `GITHUB_CLIENT_SECRET` - From GitHub OAuth App

### Payment Processing (Optional)
- `STRIPE_PUBLIC_KEY` - Your Stripe public key
- `STRIPE_SECRET_KEY` - Your Stripe secret key

### Email Service (Optional)
- `SENDGRID_API_KEY` - SendGrid API key
- `SENDGRID_FROM_EMAIL` - Sender email address

### Monitoring (Optional)
- `SENTRY_DSN` - Sentry error tracking DSN

### Application Config (Optional)
- `LOG_LEVEL` - Default: `info` (options: debug, info, warn, error)
- `API_RATE_LIMIT` - Default: `100` (requests per minute)
- `SESSION_TIMEOUT` - Default: `86400` (seconds)

## How to Add Environment Variables to Vercel

### Method 1: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com/dashboard)
2. Select your OfferBridge project
3. Click **Settings** → **Environment Variables**
4. Add each variable:
   - Key: (e.g., `MONGODB_URI`)
   - Value: (your actual value)
   - Select environments: Production, Preview, Development
5. Click **Save**

### Method 2: Via Vercel CLI
```bash
# Install/update Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add environment variables
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NEXTAUTH_SECRET
# ... etc
```

### Method 3: From .env File (Less Secure - Not Recommended)
1. Create `.env.production` locally with all vars
2. Push to GitHub (make sure it's in .gitignore)
3. Vercel will NOT automatically read this - you still need to add via dashboard
4. **Never commit secrets to git!**

## Deployment Steps

### 1. Prepare Secrets Locally (for reference)
```bash
# Generate secure secrets
openssl rand -base64 32  # Use this value for JWT_SECRET
openssl rand -base64 32  # Use this value for NEXTAUTH_SECRET
```

### 2. Add to Vercel
Open Vercel Dashboard → Project Settings → Environment Variables
Add all required variables

### 3. Deploy
Option A - Automatic (Recommended)
- Push to GitHub/GitLab → Vercel auto-deploys

Option B - Manual
```bash
npm run build  # Local build test
vercel        # Deploy to production
```

### 4. Verify Deployment
- Check Vercel deployment logs for any errors
- Test the app at https://your-vercel-app.vercel.app
- Check database connectivity
- Test authentication flows (Google/GitHub OAuth)

## Troubleshooting

### Build Still Fails After Adding Env Vars
1. Wait 2-3 minutes after adding env vars (cache clears)
2. Manually redeploy: Vercel Dashboard → Redeploy button
3. Check build logs for specific errors

### Runtime Errors About Missing Secrets
1. Verify all three core secrets are set:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NEXTAUTH_SECRET`
2. Ensure they're added to **Production** environment
3. Redeploy after adding/updating

### MongoDB Connection Fails
1. Check `MONGODB_URI` is correct
2. Verify IP whitelist in MongoDB Atlas includes Vercel IP (or 0.0.0.0 for all)
3. Test connection string locally first

### Authentication Not Working
1. Verify `NEXTAUTH_URL` matches your actual domain
2. Check OAuth credentials are valid
3. Review auth logs in application

### Next.js Config Warnings
If you still see warnings:
- Old config might be cached
- Hard refresh: Vercel Dashboard → Redeploy (force rebuild)
- Check `next.config.mjs` has no deprecated options

## Production Checklist

- [ ] All three required secrets set in Vercel (MONGODB_URI, JWT_SECRET, NEXTAUTH_SECRET)
- [ ] Database connection verified
- [ ] OAuth apps configured (Google/GitHub)
- [ ] Email service configured (if needed)
- [ ] Build completes without warnings
- [ ] First deployment test successful
- [ ] Login/signup works
- [ ] Payment flows tested
- [ ] Error tracking (Sentry) configured (optional but recommended)
- [ ] Monitor first 24h for runtime errors

## Useful Vercel Commands

```bash
# View deployment logs
vercel logs

# View environment variables
vercel env ls

# Remove an env variable
vercel env rm VARIABLE_NAME

# Check project status
vercel status
```

## Next Steps After Deployment

1. **Monitor**: Check Vercel dashboard for performance & errors
2. **Update DNS**: Point your custom domain to Vercel (if using one)
3. **SSL**: Automatic with Vercel (no action needed)
4. **Backups**: Set up MongoDB Atlas backups
5. **Analytics**: Enable Vercel Analytics (optional)

---

**Questions?** Check:
- [Vercel Docs](https://vercel.com/docs)
- [Next.js 16 Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)
