// Production configuration. All required secrets must be supplied via the
// environment — there are no insecure development fallbacks.
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'NEXTAUTH_SECRET'];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
    `Set them in the deployment environment before starting the app.`,
  );
}

const optionalEnvVars = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.APP_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'production',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

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
    logLevel: optionalEnvVars.LOG_LEVEL,
  },
  payment: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },
    feeSplit: { customer: 0.50, provider: 0.35, platform: 0.15 },
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
  },
};

export default config;
