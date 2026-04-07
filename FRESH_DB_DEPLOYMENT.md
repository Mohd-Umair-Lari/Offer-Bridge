# Fresh Database Deployment Guide

## 🚀 Quick Start

### Step 1: Create New Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - Organization: Your org
   - Project name: `offerbridge-v2`
   - Password: Create strong password
   - Region: Closest to you
4. Wait for it to create (5-10 minutes)

### Step 2: Get Your Credentials
Once ready:
1. Go to **Settings → API**
2. Copy these values:
   - `NEXT_PUBLIC_SUPABASE_URL` (starts with https://)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (long string)

### Step 3: Update Vercel
1. Go to https://vercel.com
2. Open "offer-bridge" project
3. **Settings → Environment Variables**
4. Update or create:
   ```
   NEXT_PUBLIC_SUPABASE_URL = [paste your URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [paste your key]
   ```
5. Save

### Step 4: Setup Database Schema
1. In your Supabase project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy entire content from `scripts/CLEAN_DB_SETUP.sql`
4. Paste it in the editor
5. Click **"Run"**
6. Wait for success - you should see all table names listed

### Step 5: Redeploy App
1. In VS Code terminal:
   ```bash
   git add -A
   git commit -m "Database: Fresh setup with v2 project"
   git push origin main
   ```
2. Vercel will auto-rebuild and deploy (2-3 minutes)
3. Once done, refresh your app

### Step 6: Verify
1. Open your deployed app
2. Press F12 (DevTools)
3. Go to Console tab
4. Look for:
   - `[Supabase] Configuration: { url: '✅ Set', key: '✅ Set', isConfigured: true }`
   - `[Supabase] Creating real client...`
5. Try to sign up
6. Check top right - should show **"Live DB"** in green

## ✅ You should now see:
- ✅ Login/Signup page working
- ✅ Can create accounts
- ✅ Dashboard loads with data
- ✅ "Live DB" indicator (green)
- ✅ Logout works

## 🆘 If Still Issues
Check:
1. Are environment variables showing in Vercel? (Settings → Environment Variables)
2. Did Vercel deployment complete? (check Deployments tab)
3. Is database showing "Live DB" in console? (if not, variables not loaded)
4. Try hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
