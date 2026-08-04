import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { config } from '@/lib/config';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:     config.nextauth.google.clientId,
      clientSecret: config.nextauth.google.clientSecret,
    }),
    GitHubProvider({
      clientId:     config.nextauth.github.clientId,
      clientSecret: config.nextauth.github.clientSecret,
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

  secret: config.nextauth.secret,
  session: { strategy: 'jwt' },
});

export { handler as GET, handler as POST };
