# MongoDB Migration - Next Steps

## ✅ Completed Tasks

1. **MongoDB Driver Installed**
   - Command: `npm install mongodb`
   - Added to: `package.json`

2. **MongoDB Infrastructure Created**
   - `/src/lib/mongodb.js` - Connection pooling & management
   - `/src/lib/mongoService.js` - CRUD service layer (15+ methods)
   - `/scripts/init-mongodb.mjs` - Collection initialization script

3. **All Components Updated to Use MongoDB**
   - ✅ `src/app/page.js` - Main dashboard (uses `mongoService.fetchAll()`)
   - ✅ `src/components/buyer/NewRequest.js` - Create requests (uses `mongoService.insertRequest()`)
   - ✅ `src/components/cardholder/MyCards.js` - Manage offers (uses `mongoService.insertOffer()` / `deleteOffer()`)
   - ✅ `src/components/admin/Escrow.js` - Escrow management (uses `mongoService.updateEscrowStatus()`)
   - ✅ `src/components/admin/Disputes.js` - Dispute resolution (uses `mongoService.updateDisputeStatus()`)
   - ✅ `src/lib/authContext.js` - Profile fetching (uses `mongoService.getProfile()`)

## ❌ Pending Tasks (User Action Required)

### Step 1: Set Up MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new project (e.g., "OfferBridge")
4. Create a free cluster in the region closest to you
5. Choose **M0 Free tier** (always free)

### Step 2: Get MongoDB Connection String
1. In Atlas, go to Database → Connect
2. Select "Drivers" and copy the connection string
3. Format: `mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/offerbridge`
4. Replace:
   - `USERNAME` - Your database user (create if needed)
   - `PASSWORD` - Your database password
   - `cluster` - Your cluster name (e.g., `cluster0`)

### Step 3: Add Environment Variables to Local (.env.local)
```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/offerbridge
NEXT_PUBLIC_MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/offerbridge
```

### Step 4: Initialize MongoDB Collections
Run the initialization script to create collections and indices:
```bash
node scripts/init-mongodb.mjs
```

**Expected output:**
```
✓ Connected to MongoDB: offerbridge
✓ Created collection: profiles
✓ Created collection: requests
✓ Created collection: offers
✓ Created collection: escrow
✓ Created collection: disputes
✓ Created indices for performance
✓ Setup complete
```

### Step 5: Migrate Data (If Keeping Old Supabase Data)
1. Export data from Supabase (each table as CSV/JSON)
2. Transform to MongoDB document format
3. Import to MongoDB using `mongoimport` or script

### Step 6: Test All CRUD Operations
- Create a new request → Should save to MongoDB
- Add a card offer → Should save to MongoDB
- Delete a card → Should remove from MongoDB
- Update escrow status → Should update in MongoDB
- Update dispute status → Should update in MongoDB

### Step 7: Deploy to Vercel
1. Add environment variables to Vercel project settings:
   - Go to Settings → Environment Variables
   - Add `MONGODB_URI` and `NEXT_PUBLIC_MONGODB_URI`
2. Deploy:
   ```bash
   git add .
   git commit -m "chore: Migrate database from Supabase to MongoDB"
   git push origin main
   ```

## Database Schema

### Collections Created:

**profiles**
- `_id` - ObjectId (primary key)
- `user_id` - UUID from Supabase Auth
- `role` - customer | provider | admin | customer_provider
- `full_name` - User's name
- Index: `{ user_id: 1 }`

**requests**
- `_id` - ObjectId
- `user_id` - Buyer's user ID
- `title` - Item name
- `amount` - Amount needed
- `category` - Product category
- `deadline` - Purchase deadline
- `description` - Detailed description
- `is_public` - Public or private request
- `status` - pending | matched | completed | cancelled
- Index: `{ user_id: 1, is_public: 1 }`, `{ status: 1 }`

**offers** (Credit Cards)
- `_id` - ObjectId
- `user_id` - Cardholder's user ID
- `bank` - Bank name
- `card_name` - Cardholder's name for card
- `max_amount` - Card limit
- `is_public` - Listed on marketplace
- `status` - available | active | inactive
- Index: `{ user_id: 1, is_public: 1 }`, `{ status: 1 }`

**escrow**
- `_id` - ObjectId
- `request_id` - Linked request
- `offer_id` - Linked offer
- `amount` - Amount held
- `status` - held | releasing | released
- Index: `{ status: 1 }`

**disputes**
- `_id` - ObjectId
- `request_id` - Linked request
- `buyer_id` - Buyer's user ID
- `cardholder_id` - Cardholder's user ID
- `status` - open | investigating | resolved
- `priority` - high | medium | low
- Index: `{ status: 1, priority: 1 }`

## Notes

### What Changed?
- **Data Layer**: Supabase PostgreSQL → MongoDB Atlas
- **Service Layer**: Direct `supabase.from()` calls → `mongoService.*()` methods
- **Auth**: ✅ **Still Supabase** (no changes to authentication)
- **Frontend**: No changes to React components or UI

### What Stays the Same?
- Supabase Authentication (login/logout still works)
- All UI and user experience
- Project structure and folder organization
- Component props and state management

### Benefits
✅ Eliminates Supabase request timeout issues
✅ Better control over database schema
✅ Flexible document structure (MongoDB)
✅ Free tier with good performance
✅ Easier to scale when needed

## Troubleshooting

**Cannot connect to MongoDB?**
- Check connection string (username, password, cluster name)
- Ensure IP whitelist allows your current IP in MongoDB Atlas
- Verify `.env.local` has `MONGODB_URI` set

**Collections not created?**
- Run: `node scripts/init-mongodb.mjs`
- Check MongoDB Atlas for the `offerbridge` database
- Verify connection string is correct

**No data showing in dashboard?**
- Ensure MongoDB collections are initialized
- Check MongoDB Atlas for inserted documents
- Monitor browser console for errors
- Check server logs: `npm run dev` (Next.js dev server)
