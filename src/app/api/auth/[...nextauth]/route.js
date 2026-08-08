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

  secret: config.nextauth?.secret || process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production',
  session: { strategy: 'jwt' },
});

export { handler as GET, handler as POST };
