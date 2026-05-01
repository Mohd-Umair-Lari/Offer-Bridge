import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

/**
 * NextAuth handles the OAuth redirect/callback loop with Google & GitHub.
 * NEXTAUTH_URL is automatically picked up from the environment variable —
 * on Vercel, set it to your production domain (e.g. https://offerbridge.vercel.app).
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

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider = account.provider;
        token.oauth_id = account.providerAccountId;
        token.picture  = profile.picture || profile.avatar_url || token.picture;
        token.name     = profile.name    || token.name;
        token.email    = profile.email   || token.email;
      }
      return token;
    },

    async session({ session, token }) {
      session.provider = token.provider;
      session.oauth_id = token.oauth_id;
      if (session.user) session.user.image = token.picture;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  session: { strategy: 'jwt' },
});

export { handler as GET, handler as POST };
