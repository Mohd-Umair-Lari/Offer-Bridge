import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

/**
 * NextAuth handles the OAuth redirect/callback loop with Google & GitHub.
 * After a successful OAuth, we call our own /api/auth/oauth endpoint to
 * upsert the user into MongoDB and get our custom JWT.
 *
 * We do NOT use the NextAuth MongoDB adapter or session management here —
 * we only use NextAuth for the OAuth handshake (redirect → callback → token).
 * Our custom JWT is then stored in localStorage exactly like email/password auth.
 */
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID     ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
  ],

  // Custom pages — redirect back to our app for the callback
  pages: {
    signIn:   '/auth/signin',        // We won't use this (handled in AuthScreen)
    error:    '/auth/error',
  },

  callbacks: {
    /**
     * After Google/GitHub authenticates the user, add their profile info
     * to the token so we can pass it to the client via the session.
     */
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider   = account.provider;
        token.oauth_id   = account.providerAccountId;
        token.picture    = profile.picture || profile.avatar_url || token.picture;
        token.name       = profile.name || token.name;
        token.email      = profile.email || token.email;
      }
      return token;
    },

    async session({ session, token }) {
      session.provider   = token.provider;
      session.oauth_id   = token.oauth_id;
      session.user.image = token.picture;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'gozivo-nextauth-secret',
  session: { strategy: 'jwt' },
});

export { handler as GET, handler as POST };
