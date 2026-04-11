import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { getDatabase } from '@/lib/mongodb';

const handlers = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  pages: {
    signIn: '/auth',
    callbackUrl: '/role-selection',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('[NextAuth] Sign in attempt:', { email: user.email, provider: account?.provider });
        const db = await getDatabase();
        
        // Check if user exists
        let existingUser = await db.collection('users').findOne({ email: user.email });
        
        if (!existingUser) {
          // Create new OAuth user (role will be set after user selects in RoleSelectionModal)
          console.log('[NextAuth] Creating new OAuth user:', user.email);
          const result = await db.collection('users').insertOne({
            email: user.email,
            full_name: user.name,
            profile_image: user.image,
            provider: account?.provider,
            provider_id: account?.providerAccountId,
            role: null, // Will be set in role selection modal
            oauth_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
          user.id = result.insertedId.toString();
          console.log('[NextAuth] New user created with ID:', user.id);
        } else {
          user.id = existingUser._id.toString();
          user.role = existingUser.role;
          console.log('[NextAuth] Existing user found:', { id: user.id, role: existingUser.role });
        }
        
        return true;
      } catch (error) {
        console.error('[NextAuth] Sign in error:', error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.provider = account?.provider;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.provider = token.provider;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Redirect to role selection after OAuth
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + '/role-selection';
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signOut({ token }) {
      console.log('[NextAuth] User signed out:', token.email);
    },
  },
});

export { handlers as GET, handlers as POST };
