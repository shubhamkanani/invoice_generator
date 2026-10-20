import { NextResponse } from "next/server";
import { SESSION_EXPIRED, jsonError, readJson, serverError } from "@/lib/api";
import { getApiUserId, invoiceWriteError } from "@/lib/invoices/http";
import { deleteInvoice, getInvoice, updateInvoice } from "@/lib/invoices/service";

const NOT_FOUND = "Invoice not found";

export async function GET(_request: Request, { params }: RouteContext<"/api/invoices/[id]">) {
  const userId = await getApiUserId();
  if (!userId) return jsonError(401, SESSION_EXPIRED);
  try {
    const invoice = await getInvoice(userId, (await params).id);
    return invoice ? NextResponse.json({ invoice }) : jsonError(404, NOT_FOUND);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext<"/api/invoices/[id]">) {
  const userId = await getApiUserId();
  if (!userId) return jsonError(401, SESSION_EXPIRED);
  try {
    const invoice = await updateInvoice(userId, (await params).id, await readJson(request));
    return invoice ? NextResponse.json({ invoice }) : jsonError(404, NOT_FOUND);
  } catch (error) {
    return invoiceWriteError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/invoices/[id]">) {
  const userId = await getApiUserId();
  if (!userId) return jsonError(401, SESSION_EXPIRED);
  try {
    return (await deleteInvoice(userId, (await params).id)) ? new Response(null, { status: 204 }) : jsonError(404, NOT_FOUND);
  } catch (error) {
    return serverError(error);
  }
}
