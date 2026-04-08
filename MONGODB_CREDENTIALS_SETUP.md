# 🔧 MongoDB Setup & Environment Configuration Guide

## Step 1: Get Your MongoDB Credentials

### A. Create MongoDB Atlas Account (If You Don't Have One)

1. Go to https://www.mongodb.com/cloud/atlas
2. Click **"Try Free"**
3. Sign up with email or Google
4. Create a new organization and project

### B. Create a MongoDB Cluster

1. Click **"Create a Deployment"**
2. Choose **"Free M0 Cluster"** (always free tier)
3. Select cloud provider (AWS, Azure, or GCP) - pick closest to you
4. Choose region (e.g., `us-east-1`)
5. Click **"Create Deployment"**
6. Wait 5-10 minutes for cluster to be ready

### C. Set Up MongoDB Database User

1. In MongoDB Atlas, go to **Security** → **Database Access**
2. Click **"Add New Database User"**
3. Fill in:
   - **Username**: `offerbridge_user` (or any name)
   - **Password**: Create a strong password (save this!)
4. Under Privileges, select: **Built-in Role: readWriteAnyDatabase**
5. Click **"Add User"**

**Example credentials:**
```
Username: offerbridge_user
Password: MySecurePassword123!@#
```

**⚠️ Important: Save these credentials somewhere safe!** You need them for connection string.

### D. Whitelist Your IP Address

1. Go to **Security** → **Network Access**
2. Click **"Add IP Address"**
3. Choose **"Allow Access from Anywhere"** (or add your specific IP)
   - For localhost development: 127.0.0.1
   - For Vercel production: allow 0.0.0.0/0 (Vercel uses dynamic IPs)
4. Click **"Confirm"**

### E. Get Your Connection String

1. Go to **Database** → **Clusters**
2. Click **"Connect"** on your cluster
3. Choose **"Drivers"** → **"Node.js"**
4. Copy the connection string

**It will look like:**
```
mongodb+srv://offerbridge_user:MySecurePassword123!@cluster0.xskkplv.mongodb.net/offerbridge?retryWrites=true&w=majority
```

**Replace these parts:**
- `offerbridge_user` → Your database username
- `MySecurePassword123!@#` → Your database password (URL encode special characters)
- `cluster0.xskkplv.mongodb.net` → Your cluster's connection string

---

## Step 2: Configure Environment Variables

### For Local Development

Create or edit `.env.local` in your project root:

```env
MONGODB_URI=mongodb+srv://offerbridge_user:MySecurePassword123@cluster0.xskkplv.mongodb.net/offerbridge?retryWrites=true&w=majority
NEXT_PUBLIC_MONGODB_URI=mongodb+srv://offerbridge_user:MySecurePassword123@cluster0.xskkplv.mongodb.net/offerbridge?retryWrites=true&w=majority
```

**⚠️ Important: Never commit `.env.local` to Git!** It's already in `.gitignore`

### For Vercel Production

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these two variables:

| Key | Value | Environments |
|---|---|---|
| `MONGODB_URI` | Your connection string | Production, Preview, Development |
| `NEXT_PUBLIC_MONGODB_URI` | Your connection string | Production, Preview, Development |

4. Click **"Save"**
5. Go to **Deployments** → Click **"Redeploy"**

---

## Step 3: Test Your Connection

### Test 1: Verify Environment Variables Are Loaded

```bash
echo $MONGODB_URI
echo $NEXT_PUBLIC_MONGODB_URI
```

Both should print your connection string.

### Test 2: Initialize MongoDB Collections

**Run this command ONCE to create all collections:**

```bash
node scripts/init-collections.mjs
```

**Expected output:**
```
[MongoDB] Initializing collections...
[✓] Users collection created
[✓] Profiles collection created
[✓] Requests collection created
[✓] Offers collection created
[✓] Escrow collection created
[✓] Disputes collection created

[MongoDB] Creating indexes...
[✓] Email index created on users
[✓] User ID index created on profiles
✅ All collections and indexes initialized successfully!
```

If you see errors, check:
1. `.env.local` has correct connection string
2. MongoDB credentials are correct (username, password)
3. Your IP is whitelisted in MongoDB Atlas
4. Your MongoDB cluster is running (not paused)

### Test 3: Start Dev Server and Test Signup

```bash
npm run dev
```

Open http://localhost:3000

1. Click **"Create Account"**
2. Fill in test data:
   - **Full Name**: Test User
   - **Email**: test@example.com
   - **Password**: TestPass123!
   - **Role**: Customer
3. Click **"Sign Up"**
4. Check browser console (F12 → Console tab)

**Expected console logs:**
```
[API] signup route called
[API] signup data received: { email: 'test@example.com', fullName: 'Test User', role: 'customer' }
[API] connecting to database...
[API] database connected successfully
[API] checking if user exists: test@example.com
[API] hashing password...
[API] password hashed successfully
[API] creating user document...
[API] inserting user into database...
[API] user created with ID: 507f1f77bcf86cd799439011
[API] creating user profile...
[API] inserting profile into database...
[API] profile created successfully
[API] signup completed successfully
```

Should see success message in UI!

---

## Step 4: Verify Data in MongoDB

1. Go to MongoDB Atlas
2. Click **Browse Collections**
3. Click **offerbridge** database
4. Click **users** collection
5. Should see your test user document:

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "test@example.com",
  "password": "$2a$10$...", // bcrypt hashed
  "full_name": "Test User",
  "role": "customer",
  "created_at": ISODate("2024-01-01T12:00:00Z"),
  "updated_at": ISODate("2024-01-01T12:00:00Z")
}
```

---

## 🔐 Security Tips

### Special Characters in Password

If your password has special characters, **URL encode them**:

| Character | Encoded |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `!` | `%21` |
| `$` | `%24` |
| `&` | `%26` |

**Example:**
```
Original:     mypass@test#123
Encoded:      mypass%40test%23123
Full URI:     mongodb+srv://user:mypass%40test%23123@cluster...
```

### IP Whitelist Strategy

**Development:** 
- Add your home/office IP: More secure
- Or use 127.0.0.1 for just localhost

**Production (Vercel):**
- Add `0.0.0.0/0` to allow all IPs: Vercel uses dynamic IPs
- Or: Configure Vercel IP ranges (advanced)

### Never Log Credentials

The code automatically **never logs passwords**. Check that logs never show connection string with credentials!

---

## 🐛 Troubleshooting

### Error: `MONGODB_URI environment variable is not set`

**Solution:**
```bash
# Check if .env.local exists in project root
ls -la .env.local

# Restart dev server
npm run dev
```

### Error: `authentication failed`

**Causes:**
1. Wrong username or password
2. Database user doesn't exist
3. User deleted after creation

**Solution:**
1. Go to MongoDB Atlas → Security → Database Access
2. Verify user exists with correct credentials
3. Delete and recreate if needed

### Error: `connect ECONNREFUSED 127.0.0.1:27017`

**This means: MongoDB driver trying to connect to local MongoDB instead of Atlas!**

**Solution:**
1. Check `.env.local` - must start with `mongodb+srv://` (not just `mongodb://`)
2. If using `mongodb://`, it assumes local MongoDB

### Error: `ns does not exist` or `Collections not initialized`

**This means: Collections haven't been created yet**

**Solution:**
```bash
node scripts/init-collections.mjs
```

### Signup Works Locally But Not on Vercel

**Check:**
1. Environment variables set in Vercel Settings
2. MongoDB IP whitelist allows Vercel's IPs (use `0.0.0.0/0`)
3. Check Vercel function logs: Deployments → Click deployment → Logs

### Connection Timeout

**Causes:**
1. Firewall blocking MongoDB Atlas
2. Cluster paused or shutting down
3. Wrong connection string

**Solution:**
1. Check cluster status in MongoDB Atlas
2. Verify IP whitelist
3. Try connection from MongoDB Compass (GUI tool)

---

## 📊 Connection String Format

### Atlas Connection String
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Break Down:
| Part | Example | Meaning |
|---|---|---|
| `mongodb+srv://` | Prefix | Use DNS seed list |
| `username` | `offerbridge_user` | Database user |
| `:` | Separator | - |
| `password` | `MyPass123!` | Database password |
| `@` | Separator | - |
| `cluster` | `cluster0.xskkplv` | Your cluster name |
| `.mongodb.net` | Suffix | MongoDB Atlas domain |
| `/database` | `/offerbridge` | Database name |
| `?retryWrites=true` | Option | Automatic retries |
| `&w=majority` | Option | Write confirmation |

---

## ✅ Complete Checklist

- [ ] MongoDB Atlas account created
- [ ] Free M0 cluster deployed
- [ ] Database user created with strong password
- [ ] IP whitelist configured (your IP + 0.0.0.0/0 for Vercel)
- [ ] Connection string copied and saved
- [ ] `.env.local` created with correct connection string
- [ ] `MONGODB_URI` and `NEXT_PUBLIC_MONGODB_URI` match
- [ ] Collections initialized: `node scripts/init-collections.mjs`
- [ ] Dev server started: `npm run dev`
- [ ] Signup tested locally and works
- [ ] User visible in MongoDB Atlas Collections
- [ ] Vercel environment variables configured (if deploying)
- [ ] Vercel redeployed after env vars added

---

## 📚 MongoDB Atlas Console Access

**Always keep this tab open during development:**

1. MongoDB Atlas Dashboard
2. Click **Browse Collections**
3. View all users in real-time
4. No need to query via terminal!

---

**Your MongoDB is now properly configured! Let me know if you hit any issues.** 🚀
