import { redirect } from "next/navigation";
import { cache } from "react";
import { getUserById, type UserDTO } from "@/lib/users/service";
import { getSession } from "./session";

/**
 * The signed-in user, checked against the database (a valid cookie for a
 * deleted account counts as signed out). Cached for the duration of a request.
 */
export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const session = await getSession();
  return session ? getUserById(session.userId) : null;
});

/** For pages and layouts that need a user: redirects to /login otherwise. */
export async function requireUser(): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
