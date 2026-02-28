import { auth } from "./auth";

/**
 * Require authentication and return the current user ID.
 * Throws "UNAUTHORIZED" if no session exists.
 */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}
