const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
];

const optionalEnvVars = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@offerbridge.com',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  API_RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT || '100', 10),
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '86400', 10),
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || '',
};

if (typeof window === 'undefined') {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please configure them in your .env.local file');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
  },
  nextauth: {
    secret: process.env.NEXTAUTH_SECRET,
    url: optionalEnvVars.NEXTAUTH_URL,
    google: {
      clientId: optionalEnvVars.GOOGLE_CLIENT_ID,
      clientSecret: optionalEnvVars.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: optionalEnvVars.GITHUB_CLIENT_ID,
      clientSecret: optionalEnvVars.GITHUB_CLIENT_SECRET,
    },
  },
  app: {
    env: optionalEnvVars.NODE_ENV,
    isProduction: optionalEnvVars.NODE_ENV === 'production',
    isDevelopment: optionalEnvVars.NODE_ENV === 'development',
    logLevel: optionalEnvVars.LOG_LEVEL,
  },
  payment: {
    stripe: {
      publicKey: optionalEnvVars.STRIPE_PUBLIC_KEY,
      secretKey: optionalEnvVars.STRIPE_SECRET_KEY,
    },
    webhookSecret: optionalEnvVars.PAYMENT_WEBHOOK_SECRET,
    platformFeeRate: 0.02,
  },
  email: {
    sendgridApiKey: optionalEnvVars.SENDGRID_API_KEY,
    fromEmail: optionalEnvVars.SENDGRID_FROM_EMAIL,
  },
  monitoring: {
    sentryDsn: optionalEnvVars.SENTRY_DSN,
  },
  security: {
    apiRateLimit: optionalEnvVars.API_RATE_LIMIT,
    sessionTimeout: optionalEnvVars.SESSION_TIMEOUT,
  },
};

export default config;
