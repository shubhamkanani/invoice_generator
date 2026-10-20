import { deleteSession } from "@/lib/auth/session";

export async function POST() {
  await deleteSession();
  return new Response(null, { status: 204 });
}
