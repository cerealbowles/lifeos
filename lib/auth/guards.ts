import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { User } from "@/lib/db/schema";

/** Use in Server Components/layouts. Redirects to /login if unauthenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Use in Route Handlers. Returns null instead of redirecting. */
export async function requireUserOrNull(): Promise<User | null> {
  return getCurrentUser();
}
