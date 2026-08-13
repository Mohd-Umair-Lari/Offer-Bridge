# OfferBridges

> **A peer-to-peer marketplace for credit card offers and rewards.**

[![Live App](https://img.shields.io/badge/Live%20App-offer--bridge.vercel.app-brightgreen?style=flat-square)](https://offer-bridge.vercel.app/)
[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#license)

---

## What is OfferBridges?

OfferBridges connects two groups of people:

- **Buyers** — people who want to use a specific credit card's cashback or discount for a purchase they need to make.
- **Cardholders (Providers)** — people who own credit cards with unused benefits and are willing to facilitate transactions in exchange for a commission.

Instead of letting card rewards go to waste, OfferBridges creates a trusted platform where both sides can transact securely.

---

## The Problem We Solve

| Pain Point | Who Feels It |
|---|---|
| Unused cashback & rewards expire every month | Cardholders |
| Finding the right card for a specific purchase is time-consuming | Buyers |
| Manual card-sharing is risky and unstructured | Both |

OfferBridges handles the matching, communication, and transaction structure — so neither side has to improvise.

---

## Features

### For Buyers
- Post purchase requests with amount, category, and product link
- Browse verified cardholder offers filtered by bank, cashback %, and rating
- Select the best offer and initiate a secure transaction
- Track order status in real-time

### For Cardholders (Providers)
- List credit card offers with cashback %, max transaction amount, and supported categories
- Browse open buyer requests and submit competitive offers
- Manage your card inventory from a dedicated dashboard
- Track active deals and earnings

### For Prosumers (Dual Role)
- Act as both buyer and provider from a unified dashboard
- Manage requests and offers simultaneously

### For Admins
- Platform-wide analytics and transaction monitoring
- User management and dispute resolution tools

---

## How It Works

```
Buyer                   Platform               Cardholder
  │                        │                       │
  │── Post Request ────────►│                       │
  │                        │◄── List Card Offer ───│
  │◄── Browse Offers ──────│                       │
  │── Select Offer ────────►│                       │
  │                        │──── Match Confirmed ──►│
  │                        │                       │
  │        [Transaction Tracked & Confirmed by Both]│
  │                        │                       │
  │◄── Order Complete ─────│──── Commission Paid ──►│
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Framer Motion, Recharts |
| Styling | Tailwind CSS v4 |
| Database | MongoDB Atlas |
| Auth | NextAuth v4 — JWT + OAuth (Google, GitHub) |
| Email | SendGrid |
| Hosting | Vercel |
| Fonts | Inter (Google Fonts) |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication routes (register, login, OAuth)
│   │   ├── data/           # CRUD — requests, offers, transactions
│   │   └── notifications/  # Notification endpoints
│   ├── globals.css         # Design system & utility classes
│   ├── layout.js           # Root layout with theme support
│   ├── page.js             # App shell — sidebar, routing, header
│   └── providers.js        # Session & auth context providers
│
├── components/
│   ├── admin/              # Admin overview dashboard
│   ├── auth/               # Sign-in, register, onboarding wizard
│   ├── buyer/              # Buyer dashboard, new request form
│   ├── cardholder/         # Provider dashboard, browse requests, my cards
│   ├── landing/            # Public landing page
│   ├── prosumer/           # Dual-role combined dashboard
│   ├── settings/           # Account settings page
│   └── shared/             # Reusable: modals, notifications, skeletons
│
├── lib/
│   ├── api.js              # Typed API client (all fetch calls)
│   ├── authContext.js      # Auth state, role helpers
│   ├── config.js           # Environment-aware configuration
│   ├── logger.js           # Structured logging utility
│   ├── models.js           # Mongoose schema definitions
│   └── mongodb.js          # Database connection with caching
│
└── models/                 # Standalone Mongoose model files
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth` | Register or login (email/password) |
| GET, POST | `/api/auth/[...nextauth]` | OAuth flow (Google, GitHub) |

### Data
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/data?type=all` | Fetch requests, offers, transactions |
| POST | `/api/data` | Create a request or offer |
| PATCH | `/api/data` | Update an existing item |
| DELETE | `/api/data` | Delete an item |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | Fetch user notifications |
| PATCH | `/api/notifications` | Mark notifications as read |

### System
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check — returns service status |

> **Note:** Payment processing is currently in development and not yet available.

---

## Database Schema (Overview)

### Users
```
email          String  (unique, lowercase)
password       String  (bcrypt hashed)
fullName       String
role           Enum    (customer | provider | customer_provider | admin)
avatar         String
isOnboarded    Boolean
provider       String  (local | google | github)
```

### Requests (Buyer Posts)
```
user_id        ObjectId
title          String
amount         Number
category       String
deadline       Date
description    String
product_link   String
required_card  String
is_public      Boolean
status         Enum    (open | matched | completed | cancelled)
```

### Offers (Cardholder Listings)
```
user_id        ObjectId
card_name      String
bank           String
max_amount     Number
discount       Number
cashback       Number
categories     [String]
holder_name    String
rating         Number
deals_done     Number
status         Enum    (active | inactive)
```

### Transactions
```
request_id     ObjectId
offer_id       ObjectId
buyer_id       ObjectId
provider_id    ObjectId
amount         Number
platform_fee   Number
status         Enum    (pending_payment | payment_confirmed | tracking_submitted | completed | refunded | disputed)
tracking_id    String
courier        String
```

### Notifications
```
user_id        ObjectId
type           String
title          String
message        String
action_url     String
read           Boolean
```

---

## Getting Started (Development)

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A MongoDB Atlas cluster (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/umairnow/Offer-Bridge.git
cd Offer-Bridge
pnpm install
```

### 2. Configure Environment

Create a `.env.local` file:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/offerbridge

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (optional)
SENDGRID_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

The app deploys automatically to [Vercel](https://vercel.com) on every push to `main`.

- **Live URL**: https://offer-bridge.vercel.app
- **Database**: MongoDB Atlas
- **Build command**: `pnpm build`
- **Output**: Next.js serverless functions

All environment variables above should be set in the Vercel project settings.

---

## Security

- Passwords hashed with **bcrypt** (10 rounds)
- Sessions managed with **JWT** (7-day expiry)
- **HTTPS enforced** — Vercel handles TLS
- **HSTS, CSP, X-Frame-Options** headers configured in `next.config.js`
- **Role-based access control (RBAC)** — all API routes check user role
- OAuth credentials never stored; only provider tokens are used

---

## Roadmap

- [x] User auth (email + OAuth)
- [x] Buyer request creation & management
- [x] Cardholder offer listing & management
- [x] Marketplace browsing with matching
- [x] Real-time notifications
- [x] Admin dashboard
- [x] Light/dark theme
- [ ] **Payment processing** (escrow — in development)
- [ ] Mobile apps (iOS & Android)
- [ ] Advanced analytics for providers
- [ ] Multi-currency support
- [ ] AI-powered offer matching

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: your feature description"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Security Reporting

Found a vulnerability? Please report it privately to **security@offer-bridge.vercel.app**.

Include: a description, reproduction steps, and potential impact. We respond within 48 hours.

---

## License

Proprietary — All rights reserved. © 2026 OfferBridges.

---

## Support

- **Email**: support@offer-bridge.vercel.app
- **In-app**: Use the Help option in Account Settings