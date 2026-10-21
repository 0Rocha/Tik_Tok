import { NextResponse } from "next/server";
import type { XlsxRow } from "@/lib/domain/types";
import {
  generateDeclaracoesFromRows,
  type DeclaracoesArquivo,
} from "@/lib/declaracao/generate-from-rows";
import { parseLoteBuffer } from "@/lib/declaracao/parse-lote";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function arquivoResponse(arquivo: DeclaracoesArquivo): NextResponse {
  return new NextResponse(new Uint8Array(arquivo.bytes), {
    status: 200,
    headers: {
      "Content-Type": arquivo.kind === "xlsx" ? XLSX_MIME : "application/zip",
      "Content-Disposition": `attachment; filename="${arquivo.filename}"`,
      "X-Declaracoes-Count": String(arquivo.count),
    },
  });
}

function errorStatus(message: string): number {
  return /cabeçalho|lote vazio|faltam campos|linha \d+|envie|json|rows/i.test(
    message,
  )
    ? 400
    : 500;
}

function isXlsxRow(value: unknown): value is XlsxRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.solicitante === "string" &&
    typeof row.data === "string" &&
    typeof row.usuario === "string" &&
    typeof row.nome === "string" &&
    typeof row.cpf === "string" &&
    typeof row.endereco === "string" &&
    typeof row.envio === "string" &&
    typeof row.codigoRastreio === "string" &&
    (row.valor === null || typeof row.valor === "number") &&
    (row.correio === null || typeof row.correio === "number")
  );
}

async function rowsFromJson(request: Request): Promise<XlsxRow[]> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Error("JSON inválido.");
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("rows" in body) ||
    !Array.isArray((body as { rows: unknown }).rows)
  ) {
    throw new Error('Envie JSON no formato { "rows": [...] }.');
  }

  const raw = (body as { rows: unknown[] }).rows;
  if (!raw.every(isXlsxRow)) {
    throw new Error(
      "Cada item de rows deve ter os campos do lote (strings e valor/correio number|null).",
    );
  }
  return raw;
}

async function rowsFromMultipart(request: Request): Promise<XlsxRow[]> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new Error(
      "Não foi possível ler o formulário (envie multipart/form-data).",
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new Error("Envie o arquivo do lote no campo file.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("O arquivo deve ser .xlsx.");
  }

  return parseLoteBuffer(await file.arrayBuffer());
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    const rows = contentType.includes("application/json")
      ? await rowsFromJson(request)
      : await rowsFromMultipart(request);

    const arquivo = await generateDeclaracoesFromRows(rows);
    return arquivoResponse(arquivo);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao gerar declarações.";
    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) },
    );
  }
}
