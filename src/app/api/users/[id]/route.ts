import { NextResponse } from "next/server";
import { normalizeGetUser } from "@/lib/domain/normalize-get-user";
import { fetchDistribuidor } from "@/lib/luci/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const trimmed = id?.trim() ?? "";
  if (!trimmed) {
    return NextResponse.json(
      { error: "Informe um ID válido." },
      { status: 400 },
    );
  }

  const result = await fetchDistribuidor(trimmed);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status },
    );
  }

  const normalized = normalizeGetUser(result.data);
  if (!normalized.ok) {
    return NextResponse.json(
      { error: normalized.error, code: "invalid" },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ...normalized.value,
    incomplete: normalized.incomplete,
  });
}
