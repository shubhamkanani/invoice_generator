"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Next reuses a page's earlier render when you return with the browser's Back
 * or Forward buttons. Mounting this fetches fresh server data, so amounts and
 * statuses changed elsewhere (a save, a send, a delete) show up right away.
 */
export function RefreshOnMount() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
