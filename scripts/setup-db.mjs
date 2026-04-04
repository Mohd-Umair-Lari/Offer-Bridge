const SUPABASE_URL = "https://atebyvcxdwwfejswsbyq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZWJ5dmN4ZHd3ZmVqc3dzYnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTE3NDYsImV4cCI6MjA5MDQ2Nzc0Nn0.m-jPsMfRSknNgKnG6Ig2SI_BamRN0dhPERaahpxM2KU";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function tableExists(table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, { headers });
  return r.status === 200;
}

async function insertMany(table, rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    const err = await r.text();
    console.error(`  ❌ Insert into ${table} failed:`, err);
  } else {
    console.log(`  ✅ Inserted ${rows.length} rows into ${table}`);
  }
}

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_REQUESTS = [
  {
    title: "iPhone 16 Pro — 256GB Space Black",
    amount: 1199,
    category: "Electronics",
    status: "pending",
    description:
      "Looking to purchase an iPhone 16 Pro 256GB in Space Black from the official Apple Store.",
    deadline: "2026-04-15",
  },
  {
    title: "Business Class Flight — JFK to LHR",
    amount: 4500,
    category: "Travel",
    status: "matched",
    description:
      "Need to book a business class round-trip from New York JFK to London Heathrow.",
    deadline: "2026-04-20",
  },
  {
    title: "Sony WH-1000XM5 Headphones",
    amount: 349,
    category: "Electronics",
    status: "completed",
    description: "Sony noise-cancelling wireless headphones from the Sony official store.",
    deadline: "2026-04-05",
  },
  {
    title: "Hyatt Regency — 3 Nights Dubai",
    amount: 1200,
    category: "Hotels",
    status: "pending",
    description: "Need to book 3 nights at Hyatt Regency Dubai Creek Heights, check-in April 15.",
    deadline: "2026-04-12",
  },
  {
    title: "MacBook Air M3 — 15-inch Silver",
    amount: 1299,
    category: "Electronics",
    status: "pending",
    description: "MacBook Air M3 15-inch, 8GB RAM, 256GB SSD in Silver from Apple.",
    deadline: "2026-04-18",
  },
];

const SEED_OFFERS = [
  {
    card_name: "Chase Sapphire Reserve",
    card_type: "Visa Infinite",
    bank: "Chase",
    categories: ["Travel", "Hotels", "Dining"],
    discount: 10,
    cashback: 3,
    max_amount: 5000,
    expiry: "2026-04-30",
    status: "available",
    holder_name: "Alex M.",
    deals_done: 12,
    rating: 4.9,
    verified: true,
  },
  {
    card_name: "Amex Platinum",
    card_type: "Amex Centurion",
    bank: "American Express",
    categories: ["Electronics", "Luxury", "Hotels"],
    discount: 15,
    cashback: 5,
    max_amount: 10000,
    expiry: "2026-05-15",
    status: "available",
    holder_name: "Sarah K.",
    deals_done: 28,
    rating: 5.0,
    verified: true,
  },
  {
    card_name: "Citi Prestige",
    card_type: "Mastercard World Elite",
    bank: "Citibank",
    categories: ["Travel", "Dining", "Hotels"],
    discount: 12,
    cashback: 4,
    max_amount: 8000,
    expiry: "2026-04-20",
    status: "available",
    holder_name: "James R.",
    deals_done: 7,
    rating: 4.7,
    verified: true,
  },
  {
    card_name: "Discover it Cash Back",
    card_type: "Discover",
    bank: "Discover",
    categories: ["Electronics", "Online Shopping"],
    discount: 5,
    cashback: 5,
    max_amount: 2000,
    expiry: "2026-06-30",
    status: "available",
    holder_name: "Priya N.",
    deals_done: 3,
    rating: 4.5,
    verified: false,
  },
  {
    card_name: "Capital One Venture X",
    card_type: "Visa Infinite",
    bank: "Capital One",
    categories: ["Travel", "Hotels", "Car Rental"],
    discount: 8,
    cashback: 2,
    max_amount: 6000,
    expiry: "2026-05-31",
    status: "available",
    holder_name: "Marcus T.",
    deals_done: 19,
    rating: 4.8,
    verified: true,
  },
];

const SEED_ESCROW = [
  {
    deal_id: "ESC-001",
    buyer: "John D.",
    cardholder: "Sarah K.",
    item: "Amex Platinum — Electronics Deal",
    amount: 1199,
    fee: 23.98,
    status: "held",
  },
  {
    deal_id: "ESC-002",
    buyer: "Maria L.",
    cardholder: "James R.",
    item: "Citi Prestige — JFK to LHR Flight",
    amount: 4500,
    fee: 90.0,
    status: "releasing",
  },
  {
    deal_id: "ESC-003",
    buyer: "Tom B.",
    cardholder: "Alex M.",
    item: "Chase Sapphire — Hotel Dubai",
    amount: 1200,
    fee: 24.0,
    status: "released",
  },
];

const SEED_DISPUTES = [
  {
    dispute_id: "DIS-001",
    buyer: "John D.",
    cardholder: "Sarah K.",
    item: "Electronics Deal — Sony Headphones",
    amount: 349,
    reason: "Cardholder did not complete the purchase within the agreed timeframe.",
    status: "open",
    priority: "high",
  },
  {
    dispute_id: "DIS-002",
    buyer: "Carlos M.",
    cardholder: "Priya N.",
    item: "Electronics — MacBook Air M3",
    amount: 1299,
    reason: "Amount charged was higher than agreed upon.",
    status: "investigating",
    priority: "medium",
  },
  {
    dispute_id: "DIS-003",
    buyer: "Aisha P.",
    cardholder: "Alex M.",
    item: "Hotel Booking — Hyatt Paris",
    amount: 800,
    reason: "Booking was cancelled by the cardholder without prior notice.",
    status: "resolved",
    priority: "low",
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔎 Checking existing tables…\n");

  // requests
  const hasRequests = await tableExists("requests");
  if (hasRequests) {
    console.log("✅ requests table found");
    // Check if empty
    const r = await fetch(`${SUPABASE_URL}/rest/v1/requests?select=id&limit=1`, { headers });
    const rows = await r.json();
    if (rows.length === 0) {
      console.log("   (empty) — seeding…");
      await insertMany("requests", SEED_REQUESTS);
    } else {
      console.log(`   (has ${rows.length}+ rows) — skipping seed`);
    }
  } else {
    console.log("❌ requests table not found — create it in Supabase dashboard first");
  }

  // offers
  const hasOffers = await tableExists("offers");
  if (hasOffers) {
    console.log("✅ offers table found");
    const r = await fetch(`${SUPABASE_URL}/rest/v1/offers?select=id&limit=1`, { headers });
    const rows = await r.json();
    if (rows.length === 0) await insertMany("offers", SEED_OFFERS);
    else console.log(`   (has data) — skipping seed`);
  } else {
    console.log("❌ offers table missing — will be created via SQL");
  }

  // escrow
  const hasEscrow = await tableExists("escrow");
  if (hasEscrow) {
    console.log("✅ escrow table found");
    const r = await fetch(`${SUPABASE_URL}/rest/v1/escrow?select=id&limit=1`, { headers });
    const rows = await r.json();
    if (rows.length === 0) await insertMany("escrow", SEED_ESCROW);
  } else {
    console.log("❌ escrow table missing — will be created via SQL");
  }

  // disputes
  const hasDisputes = await tableExists("disputes");
  if (hasDisputes) {
    console.log("✅ disputes table found");
    const r = await fetch(`${SUPABASE_URL}/rest/v1/disputes?select=id&limit=1`, { headers });
    const rows = await r.json();
    if (rows.length === 0) await insertMany("disputes", SEED_DISPUTES);
  } else {
    console.log("❌ disputes table missing — will be created via SQL");
  }

  console.log("\n✅ Done. Check Supabase dashboard to create missing tables using the SQL in scripts/schema.sql");
}

main().catch(console.error);
