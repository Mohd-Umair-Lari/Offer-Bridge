import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { config } from '@/lib/config';

const providers = [];

if (config.nextauth?.google?.clientId && config.nextauth?.google?.clientSecret) {
  providers.push(
    GoogleProvider({
      clientId: config.nextauth.google.clientId,
      clientSecret: config.nextauth.google.clientSecret,
    })
  );
}

if (config.nextauth?.github?.clientId && config.nextauth?.github?.clientSecret) {
  providers.push(
    GitHubProvider({
      clientId: config.nextauth.github.clientId,
      clientSecret: config.nextauth.github.clientSecret,
    })
  );
}

const handler = NextAuth({
  providers,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider = account.provider;
        // GitHub uses 'id' (number), Google uses 'sub' — providerAccountId works for both
        token.oauth_id = String(account.providerAccountId);
        // GitHub profile has avatar_url; Google has picture
        token.picture  = profile.avatar_url || profile.picture || token.picture;
        token.name     = profile.name    || profile.login || token.name;
        token.email    = profile.email   || token.email;
      }
      return token;
    },

    async session({ session, token }) {
      session.provider = token.provider  || null;
      session.oauth_id = token.oauth_id  || null;
      if (session.user) {
        session.user.image = token.picture || session.user.image;
        // Ensure name is populated from token if missing
        if (!session.user.name && token.name) session.user.name = token.name;
      }
      return session;
    },
  },

  secret: config.nextauth?.secret || process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production',
  session: { strategy: 'jwt' },
});

export { handler as GET, handler as POST };
