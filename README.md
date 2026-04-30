This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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
