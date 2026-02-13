import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// All platforms to grant during BETA period
const BETA_PLATFORMS = [
  "VALORA",
  "BUSINESS_NOW",
  "LEGACY_CRM",
  "HUB",
  "VENUEVR",
  "LOUD_WORKS",
] as const;

// Only register Google OAuth when both credentials are provided
const googleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/onboarding",
  },
  providers: [
    ...(googleCredentials
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = credentials.email.trim().toLowerCase();

        let user;
        try {
          user = await prisma.user.findUnique({
            where: {
              email,
            },
          });
        } catch (dbError) {
          console.error("[auth] Database error during sign-in:", dbError);
          throw new Error("DatabaseError");
        }

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionStatus: "active",
        };
      },
    }),
  ],
  events: {
    // When a new user is created via OAuth (e.g. Google), grant BETA platform access
    createUser: async ({ user }) => {
      if (!user.id) return;
      try {
        for (const platform of BETA_PLATFORMS) {
          await prisma.platformAccess.upsert({
            where: {
              userId_platform: {
                userId: user.id,
                platform,
              },
            },
            update: { enabled: true },
            create: {
              userId: user.id,
              platform,
              enabled: true,
            },
          });
        }
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "beta_user_registered_oauth",
            entityType: "user",
            entityId: user.id,
            details: {
              email: user.email,
              provider: "google",
              isBeta: true,
              platformsGranted: BETA_PLATFORMS.length,
            },
          },
        });
      } catch (err) {
        console.error("Error granting BETA platform access:", err);
      }
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
        // BETA period: all users get active status
        token.subscriptionStatus = "active";
      }
      // For OAuth users, fetch role from DB on first sign-in
      if (account?.provider === "google" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          }
        } catch {
          // Fallback to USER role
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.subscriptionStatus = token.subscriptionStatus;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
