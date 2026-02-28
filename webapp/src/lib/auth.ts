import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { queryOne } from "./db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

const providers = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })]
    : []),
  Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await queryOne<{
          id: string;
          email: string;
          password_hash: string | null;
        }>(
          "SELECT id, email, password_hash FROM users WHERE email = $1",
          [email]
        );

        if (!user || !user.password_hash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return null;
        }

        return { id: user.id, email: user.email };
      },
    }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  trustHost: true,
  providers,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/onboarding/signup",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in: user object is present
      if (user) {
        token.userId = user.id;
      }

      // Google OAuth: upsert user into DB
      if (account?.provider === "google" && token.email) {
        const email = token.email as string;

        // Check if user exists
        const existingUser = await queryOne<{ id: string }>(
          "SELECT id FROM users WHERE email = $1",
          [email]
        );

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Insert new user
          const newUser = await queryOne<{ id: string }>(
            "INSERT INTO users (email, provider) VALUES ($1, 'google') RETURNING id",
            [email]
          );
          if (!newUser) {
            throw new Error("Failed to create user");
          }
          userId = newUser.id;
        }

        // Ensure profile exists
        await queryOne(
          "INSERT INTO profiles (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [userId, email]
        );

        token.userId = userId;
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
