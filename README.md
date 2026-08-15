# OfferBridges

> **A peer-to-peer marketplace for credit card offers, rewards, and secure escrow purchases.**

[![Live App](https://img.shields.io/badge/Live%20App-offer--bridge.vercel.app-brightgreen?style=flat-square)](https://offer-bridge.vercel.app/)
[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Razorpay](https://img.shields.io/badge/Payment-Razorpay%20Escrow-blue?style=flat-square)](https://razorpay.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#license)

---

## What is OfferBridges?

OfferBridges connects two groups of people:

- **Buyers** — people who want to use a specific credit card's cashback or discount for a purchase they need to make.
- **Cardholders (Providers)** — people who own credit cards with unused benefits and are willing to facilitate transactions in exchange for a commission.

Instead of letting card rewards go to waste, OfferBridges creates a trusted platform with **automated matching, secure Razorpay escrow payments, and live order tracking**.

---

## The Problem We Solve

| Pain Point | Who Feels It |
|---|---|
| Unused cashback & rewards expire every month | Cardholders |
| Finding the right card for a specific purchase is time-consuming | Buyers |
| Manual card-sharing is risky and unstructured | Both |

OfferBridges handles the matching, escrow payments, tracking submission, and automatic fund release — keeping both parties safe.

---

## Features

### For Buyers
- Post purchase requests with amount, category, and product link
- Browse verified cardholder offers filtered by bank, cashback %, and rating
- Secure checkout powered by Razorpay (UPI, Cards, Netbanking) with Escrow hold
- Real-time order and shipment tracking
- 100% automated refund guarantee if the provider misses the 24-hour deadline

### For Cardholders (Providers)
- List credit card offers with cashback %, max transaction amount, and supported categories
- Browse open buyer requests and submit competitive offers
- Manage your card inventory from a dedicated dashboard
- Track active deals, fulfill orders, and receive direct commission payouts

### For Prosumers (Dual Role)
- Act as both buyer and provider from a unified dashboard
- Manage requests and offers simultaneously

### For Admins
- Platform-wide analytics and transaction monitoring
- User management, dispute resolution, and commission tracking

---

## How It Works

```
Buyer                         OfferBridges (Escrow)             Cardholder (Provider)
  │                                    │                                  │
  │── 1. Create Purchase Request ─────►│                                  │
  │                                    │◄── 2. List Card / Make Offer ────│
  │◄── 3. Review Matched Offer ────────│                                  │
  │                                    │                                  │
  │── 4. Pay via Razorpay (Escrow) ───►│                                  │
  │      (Funds Held Safely in Escrow) │──── 5. Order Notification ──────►│
  │                                    │                                  │
  │                                    │◄── 6. Place Order & Add Tracking─│
  │◄── 7. Tracking & Order Received ───│                                  │
  │                                    │──── 8. Escrow Released ─────────►│
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Framer Motion, Recharts, Lucide Icons |
| Styling | Tailwind CSS v4 + Responsive Mobile Bottom Navigation |
| Database | MongoDB Atlas (Mongoose ODM) |
| Authentication | NextAuth v4 (JWT + Google/GitHub OAuth + Credentials) |
| Payments | Razorpay Payments & Escrow (Order Creation, HMAC Verification, Webhooks) |
| AI / LLM | Groq API (High-speed LLaMA 3 for offer matching & product extraction) |
| Hosting | Vercel Serverless Platform |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication routes (register, login, OAuth)
│   │   ├── data/           # CRUD — requests, offers, transactions
│   │   ├── payment/        # Razorpay integration (order creation, verification)
│   │   │   ├── tracking/   # Shipment tracking submission & payment release
│   │   │   ├── refund-check/# 24h deadline automated refund engine
│   │   │   └── webhook/    # Idempotent Razorpay webhook event processor
│   │   ├── crawler/        # Scraper / card benefits extraction
│   │   └── notifications/  # User notifications and alerts
│   ├── globals.css         # Design system & mobile-first utility classes
│   ├── layout.js           # Root layout with theme support
│   ├── page.js             # App shell — responsive sidebar, mobile nav, header
│   └── providers.js        # Session & auth context providers
│
├── components/
│   ├── admin/              # Admin overview dashboard
│   ├── auth/               # Sign-in, register, onboarding wizard
│   ├── buyer/              # Buyer dashboard, new request form
│   ├── cardholder/         # Provider dashboard, browse requests, my cards
│   ├── landing/            # Public responsive landing page
│   ├── prosumer/           # Dual-role combined dashboard
│   ├── settings/           # Account settings page
│   └── shared/             # Reusable: PaymentModal (Razorpay), TrackingModal, Skeletons
│
├── lib/
│   ├── api.js              # Typed API client (all fetch calls)
│   ├── authContext.js      # Auth state, role helpers
│   ├── config.js           # Environment-aware configuration
│   ├── logger.js           # Structured logging utility
│   ├── models.js           # Mongoose schema definitions (User, Request, Offer, Transaction, PaymentEvent)
│   └── mongodb.js          # Database connection with caching
│
└── models/                 # Standalone Mongoose model schemas
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth` | Register or login (email/password) |
| GET, POST | `/api/auth/[...nextauth]` | OAuth flow (Google, GitHub) |

### Data & Marketplace
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/data?type=all` | Fetch requests, offers, transactions |
| POST | `/api/data` | Create a request or offer |
| PATCH | `/api/data` | Update an existing item |
| DELETE | `/api/data` | Delete an item |

### Payments & Escrow
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payment` | Initiate transaction and match request with card offer |
| PUT | `/api/payment` | Create Razorpay order (`create-order`) and verify payment (`verify-payment`) |
| POST | `/api/payment/tracking` | Submit tracking details and release escrow funds |
| POST | `/api/payment/webhook` | Idempotent webhook receiver for Razorpay events (`payment.captured`, etc.) |
| GET | `/api/payment/refund-check` | Automated cron/trigger to refund transactions past the 24-hour deadline |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | Fetch user notifications |
| PATCH | `/api/notifications` | Mark notifications as read |

### System & Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check — returns service status |

---

## Database Schema (Overview)

### Users
```
email               String  (unique, lowercase)
password            String  (bcrypt hashed)
fullName            String
role                Enum    (customer | provider | customer_provider | admin)
avatar              String
onboarding_complete Boolean
oauth_provider      String
phone               String
```

### Requests (Buyer Posts)
```
user_id        ObjectId (ref: User)
title          String
amount         Number
category       String
deadline       String
description    String
product_link   String
best_card_info Object
status         Enum    (pending | matched | completed | cancelled)
```

### Offers (Cardholder Listings)
```
user_id        ObjectId (ref: User)
card_name      String
bank           String
max_amount     Number
discount       Number
cashback       Number
categories     [String]
holder_name    String
rating         Number
deals_done     Number
status         String
```

### Transactions
```
request_id            ObjectId
offer_id              ObjectId
buyer_id              ObjectId
provider_id           ObjectId
amount                Number
razorpay_order_id     String (unique, sparse)
razorpay_payment_id   String (unique, sparse)
razorpay_signature    String
payment_provider      String (razorpay)
tracking_id           String
courier               String
card_discount_amount  Number
customer_savings      Number
provider_earning      Number
platform_commission   Number
status                Enum (pending_payment | payment_received | tracking_pending | tracking_submitted | completed | refunded | cancelled)
payment_at            Date
tracking_due_at       Date
completed_at          Date
refunded_at           Date
```

---

## Environment Setup

Create a `.env` or `.env.local` file with the following variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/offerbridge

JWT_SECRET=your-jwt-secret-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://offer-bridge.vercel.app

# GROQ API Key (LLM parsing)
GROQ_API_KEY=your-groq-api-key-here

# Razorpay Keys
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
```

---

## Deployment

The application is deployed on **Vercel**:

- **Production URL**: [https://offer-bridge.vercel.app/](https://offer-bridge.vercel.app/)
- **Build Command**: `pnpm build`
- **Output**: Next.js Serverless Functions

To deploy updates, push directly to `main`:

```bash
git add -A
git commit -m "feat: release updates"
git push origin main
```

---

## Security & Reliability

- **Escrow Fund Protection**: Funds are captured through Razorpay and only released after verified shipment tracking.
- **HMAC Signature Verification**: All checkout callbacks and incoming webhooks are validated using cryptographic SHA-256 HMACs with constant-time comparison.
- **Webhook Idempotency**: `PaymentEvent` model prevents double processing on webhook retries.
- **Password Security**: Password hashing with `bcryptjs` (10 rounds).
- **Session Handling**: Secure JWT tokens with NextAuth integration.
- **Strict Headers**: HSTS, CSP, and X-Frame-Options headers enabled.

---

## Roadmap

- [x] User authentication (Email + Google/GitHub OAuth)
- [x] Buyer purchase request creation & auto-scraping
- [x] Cardholder offer listing & inventory dashboard
- [x] Real-time offer matching & commission calculation
- [x] **Razorpay Escrow Integration & Payment Verification**
- [x] **Automated 24h refund checker & tracking workflow**
- [x] **Responsive Mobile-First UI & Bottom Navigation**
- [x] Light / Dark Theme toggle
- [ ] Mobile Apps (iOS & Android)
- [ ] Multi-currency & Global Cards Support
- [ ] Advanced Provider Analytics

---

## Support & Contact

- **Email**: support@offer-bridge.vercel.app
- **In-App**: Account Settings → Help & Support
- **Issues**: Report via GitHub or support email

---

## License

Proprietary — All rights reserved. © 2026 OfferBridges.