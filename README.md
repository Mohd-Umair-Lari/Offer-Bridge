# OfferBridge - Production SaaS Platform

A modern, secure, and scalable payment escrow marketplace platform connecting card buyers and service providers.

## Features

### For Buyers
- Create service requests with specifications
- Browse provider offers
- Secure escrow payments
- Real-time order tracking
- Instant notifications
- Multi-role support (buyer, provider, both)

### For Providers
- Browse market requests
- Submit competitive offers
- Real-time card inventory management
- Payment escrow protection
- Automated payment release on order completion
- Performance dashboard

### For Admins
- Platform analytics and overview
- Transaction monitoring
- User management
- Dispute resolution
- Revenue tracking

## Technology Stack

- **Frontend**: Next.js 16, React 19, Framer Motion, Recharts
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth v4 with JWT + OAuth (Google, GitHub)
- **Payment**: Stripe Escrow Integration
- **Email**: SendGrid
- **Styling**: Tailwind CSS
- **Deployment**: Vercel, AWS, DigitalOcean

## Security

### API Security
- JWT authentication with 7-day expiry
- Environment variable based secrets
- No hardcoded credentials
- Request validation on all endpoints
- Role-based access control (RBAC)

### Data Protection
- Bcrypt password hashing (10 rounds)
- MongoDB unique constraints on sensitive fields
- HTTPS enforcement
- HSTS headers
- CSP headers configured
- XSS protection enabled

### OAuth Security
- Provider credential validation
- Secure callback URL handling
- Session-based state management
- Token expiry enforcement

### Payment Security
- Stripe payment tokenization
- Escrow hold mechanism
- Automatic refund processing
- Webhook signature verification
- PCI compliance via Stripe

## Getting Started

### Local Development

```bash
node --version  # Requires v18+

git clone <repository>
cd offer-bridge

npm install
cp .env.example .env.local

# Edit .env.local with your credentials
npm run dev
```

Visit http://localhost:3000

### Environment Variables

See `.env.example` for all required variables. Key requirements:
- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - Secure JWT signing key
- `NEXTAUTH_SECRET` - NextAuth session encryption
- OAuth credentials (optional but recommended)

## API Endpoints

### Authentication
- `POST /api/auth` - Register, login, get current user
- `GET|POST /api/auth/[...nextauth]` - NextAuth OAuth flow

### Data Management
- `GET /api/data?type=all|requests|offers|transactions` - Fetch data
- `POST /api/data` - Create request/offer
- `PATCH /api/data` - Update request/offer
- `DELETE /api/data` - Delete item

### Payments
- `GET /api/payment?userId=xxx` - Get user transactions
- `POST /api/payment` - Create transaction (offer)
- `PUT /api/payment` - Confirm payment (buyer action)
- `POST /api/payment/tracking` - Submit tracking (provider action)
- `GET /api/payment/refund-check` - Auto-refund checker

### Notifications
- `GET /api/notifications?limit=20` - Fetch notifications
- `PATCH /api/notifications` - Mark as read

## Database Schema

### Users
- email (unique, lowercase)
- password (bcrypt hashed)
- fullName, role, avatar
- OAuth provider info
- Onboarding status

### Requests
- user_id, title, amount
- category, deadline, description
- product_link, required_card
- is_public, status

### Offers
- user_id, card_name, bank
- max_amount, discount, cashback
- categories, holder_name
- rating, deals_done, status

### Transactions
- request_id, offer_id
- buyer_id, provider_id
- amount, platform_fee
- payment_at, tracking_due_at
- status with enum states
- tracking_id, courier

### Notifications
- user_id, type, title, message
- action_url, tx_id, read status

## Error Handling

- Structured JSON error responses
- Appropriate HTTP status codes
- Request validation with helpful messages
- Database error handling
- Graceful degradation

## Rate Limiting

Configured via `API_RATE_LIMIT` environment variable (default 100 req/s).

Recommended production limits:
- Auth endpoints: 10/minute
- Data endpoints: 100/minute  
- Payment endpoints: 50/minute

## Monitoring

### Health Check
`GET /api/health` - Returns service status

### Logging
- JSON structured logs
- Configurable log levels (debug, info, warn, error)
- Automatic error tracking with Sentry

### Metrics to Monitor
- API response times
- Error rates
- Database connection pool
- Active user sessions
- Payment processing success rate

## Deployment

See `DEPLOYMENT.md` for comprehensive deployment guide covering:
- Environment setup
- MongoDB Atlas configuration
- OAuth provider setup
- Vercel deployment
- Self-hosted options (Docker, Linux)
- Security checklist
- Monitoring setup

## Production Checklist

- [x] All secrets in environment variables
- [x] HTTPS/TLS configured
- [x] Database backups enabled
- [x] Error tracking enabled
- [x] Log aggregation configured
- [x] Rate limiting implemented
- [x] Security headers added
- [x] Performance optimized
- [x] Automated tests added
- [x] Monitoring alerts set up

## Testing

```bash
npm run test          # Run tests
npm run lint          # Lint code
npm run build         # Production build
npm run start         # Start production server
npm run dev           # Start development server
```

## File Structure

```
src/
  app/                    # Next.js pages and layouts
    api/                  # API routes
      auth/              # Authentication routes
      data/              # CRUD operations
      payment/           # Payment processing
      notifications/     # Notification endpoints
    page.js              # Main app layout
    layout.js            # Root layout
    globals.css          # Global styles
    providers.js         # Context providers

  components/            # React components
    admin/               # Admin dashboard
    auth/                # Auth & onboarding
    buyer/               # Buyer features
    cardholder/          # Provider features
    landing/             # Landing page
    prosumer/            # Dual-role features
    shared/              # Shared components

  lib/                   # Utilities and helpers
    api.js               # API client
    authContext.js       # Auth state management
    config.js            # Configuration
    logger.js            # Logging utility
    models.js            # Mongoose schemas
    mongodb.js           # Database connection
    cacheService.js      # Caching logic
```

## Code Style

- ES6+ JavaScript
- Functional React components
- Hooks for state management
- No hardcoded magic strings
- Consistent naming conventions
- Comprehensive error handling

## Performance

- Next.js React Compiler enabled
- SWC minification
- Automatic code splitting
- Image optimization
- CSS-in-JS optimized
- Database query optimization

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Commit changes: `git commit -m "Description"`
3. Push to branch: `git push origin feature/name`
4. Create Pull Request

## Security Reporting

Found a security vulnerability? Email security@yourdomain.com with:
- Vulnerability description
- Steps to reproduce
- Potential impact
- Proposed fix (optional)

## License

Proprietary - All rights reserved

## Support

- Documentation: See README.md and DEPLOYMENT.md
- Issues: GitHub Issues
- Email: support@yourdomain.com

## Roadmap

- [ ] Automated refund processing cron job
- [ ] Advanced dispute resolution system
- [ ] User reputation/rating system
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Blockchain for transaction verification
- [ ] Advanced analytics dashboard
- [ ] API webhooks for integrations

## Version

Current: v1.0.0
Last Updated: 2026

---

**Built with security and scalability first. Production-ready SaaS from day one.**

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# OfferBridge (Main Branch)

A comprehensive Business-to-Business (B2B) SaaS marketplace built with Next.js, TypeScript, and Tailwind CSS. This platform connects businesses looking to offer discounts and vouchers with customers seeking deals.

## 📂 Repository Structure

```
OfferBridge/
├── app/                    # Next.js App Router pages and layouts
├── components/             # Reusable React components
│   ├── Admin/              # Admin dashboard components (e.g., Users, Settings)
│   ├── Business/           # Business/Merchant components (e.g., Vouchers, Reports)
│   ├── Customer/           # Customer/End-user components (e.g., Discover, Redeem)
│   └── UI/                 # Common UI elements (Buttons, Modals, etc.)
├── lib/                    # Utility functions and libraries
│   └── supabaseClient.ts   # Supabase client configuration
├── middleware.ts           # Middleware for routing protection and tenant detection
├── prisma/                 # Prisma ORM schema and migrations (backend)
│   └── schema.prisma       # Database schema definition
├── public/                 # Static assets (images, fonts, etc.)
├── package.json            # Project dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher)
- **PostgreSQL** (for Supabase/Prisma backend)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd OfferBridge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Database Setup (Prisma):**
   - Ensure you have a Supabase project set up
   - Create a `.env.local` file in the root directory with your Supabase credentials:
     ```env
     DATABASE_URL="postgresql://user:password@host:port/database"
     NEXTAUTH_SECRET="your-secret-key"
     NEXTAUTH_URL="http://localhost:3000"
     ```
   - Apply database migrations:
     ```bash
     npx prisma db push
     ```

4. **Start Development Server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The application will be available at `http://localhost:3000`.

## 🧩 Key Features

- **Multi-Tenant Architecture**: Seamless experience for Customers, Businesses, and Admins
- **Admin Dashboard**: Comprehensive management of users, businesses, and platform settings
- **Business Portal**: Create, manage, and track voucher/discount campaigns
- **Customer Discovery**: Browse and search for offers based on location and category
- **Redemption System**: Secure voucher validation and usage tracking
- **Authentication**: Secure sign-in with Supabase Auth
- **Responsive Design**: Built with Tailwind CSS for optimal viewing on all devices

## 🗂️ Feature Modules

### Admin Module
- User Management: View and manage all platform users
- Business Verification: Review and approve new business registrations
- Platform Configuration: Manage system settings and policies

### Business Module
- Voucher Creation: Create and customize discount vouchers with codes and QR codes
- Voucher Management: Edit, pause, or delete active voucher campaigns
- Analytics: Track voucher redemptions and business performance

### Customer Module
- Voucher Discovery: Filter and search for vouchers by category (e.g., Fashion, Food, Health)
- Voucher Details: View complete offer information and terms
- Wallet/Collection: Save and manage collected vouchers
- Redemption: Redeem vouchers in-store with QR code scanning

## 🛠️ Technology Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **ORM**: Prisma
- **Deployment**: Vercel (recommended)

## 📦 Script Commands

- `npm run dev`: Start development server
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run db:push`: Apply database migrations
