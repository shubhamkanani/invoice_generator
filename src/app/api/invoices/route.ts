import { NextResponse } from "next/server";
import { SESSION_EXPIRED, jsonError, readJson, serverError } from "@/lib/api";
import { getApiUserId, invoiceWriteError } from "@/lib/invoices/http";
import { createInvoice, listInvoices } from "@/lib/invoices/service";

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return jsonError(401, SESSION_EXPIRED);
  try {
    return NextResponse.json({ invoices: await listInvoices(userId) });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const userId = await getApiUserId();
  if (!userId) return jsonError(401, SESSION_EXPIRED);
  try {
    const invoice = await createInvoice(userId, await readJson(request));
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return invoiceWriteError(error);
  }
}
