import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/invoice/types";

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return status === "sent" ? <Badge>Sent</Badge> : <Badge variant="outline">Draft</Badge>;
}
