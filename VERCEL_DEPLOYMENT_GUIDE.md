# 🚀 Vercel Deployment Guide for OfferBridge

Your Next.js project structure has been fully optimized and is ready for Vercel deployment! 

## Important Changes Made
1. **Fixed Supabase Build Crash**: Previously, Next.js static prerendering would crash because Supabase environment variables aren't present natively during the initial local build. A safe fallback was added to `src/lib/supabase.js`.
2. **Updated `.gitignore`**: Replaced your simple gitignore with the Standard Next.js ignoring rules (prevents uploading `.env` and `.next/` cache to GitHub).
3. **Verified the build**: I successfully ran `npm install` and `npm run build`. The project now compiles with `0` errors.

You can upload and deploy your project using **Method 1 (Recommended - via GitHub)** or **Method 2 (via Vercel CLI)**.

---

## Method 1: Deploying via GitHub (Recommended for Free CI/CD updates)

This is the standard Vercel workflow. Any time you push new code to GitHub, Vercel will automatically deploy it.

### Step 1: Upload to GitHub
1. Open your terminal in this directory (`c:\Users\umair\projects\offerbridge\Offer-Bridge-deploy`)
2. Run the following commands to initialize Git and commit your code:
   ```bash
   git add .
   git commit -m "Initial Vercel Deployment Setup"
   ```
3. Create a new empty repository on your [GitHub account](https://github.com/new).
4. Run the commands GitHub provides to push your code. It usually looks like this:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YourUsername/YourRepoName.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New"** > **"Project"**.
3. Locate the GitHub repository you just created and click **"Import"**.
4. Leave the Framework Preset as **Next.js** and the Root Directory as `./`.

### Step 3: Add Environment Variables
Before you click Deploy, expand the **"Environment Variables"** dropdown!
Add the following keys exactly as they are named in your Supreme project:

- **Key:** `NEXT_PUBLIC_SUPABASE_URL` 
  **Value:** *(Your Supabase Project URL)*
- **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  **Value:** *(Your Supabase Anon/Public Key)*

### Step 4: Deploy!
Click **Deploy**. Vercel will build the project (which we just proved works perfectly). Once finished, you'll be given a live `yourapp.vercel.app` URL.

---

## Method 2: Deploying via Vercel CLI (Direct from Terminal)

If you just want to push this exact folder straight to Vercel without using GitHub:

1. Open your terminal in this directory.
2. Run the Vercel app command:
   ```bash
   npx vercel
   ```
3. It will ask you to log in (usually opens your browser).
4. Follow the prompt instructions:
   - "Set up and deploy?" -> **Y**
   - "Which scope do you want to deploy to?" -> *(Your username)*
   - "Link to existing project?" -> **N**
   - "What's your project's name?" -> **offer-bridge**
   - "In which directory is your code located?" -> **./** (Just press Enter)
   - "Want to modify these settings?" -> **N**
5. **Adding Environment variables:**
   Once it completes the initial setup, you must run this command to add your Supabase connection strings so the deployed app actually connects to the database:
   ```bash
   npx vercel env add NEXT_PUBLIC_SUPABASE_URL
   # (Paste your URL when prompted)
   
   npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # (Paste your KEY when prompted)
   ```
6. Run the final production build command:
   ```bash
   npx vercel --prod
   ```
