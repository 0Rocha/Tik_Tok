import { NextResponse } from "next/server";
import { parseProdutos, type ProdutoItem } from "@/lib/domain/listas-produtos";
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
  return /cabeçalho|lote vazio|faltam campos|linha \d+|envie|json|rows|produto/i.test(
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

type DeclaracaoRequest = {
  rows: XlsxRow[];
  produtos?: ProdutoItem[];
};

function produtosFromBody(body: object): ProdutoItem[] | undefined {
  if (!("produtos" in body)) return undefined;
  return parseProdutos((body as { produtos: unknown }).produtos);
}

function produtosFromForm(form: FormData): ProdutoItem[] | undefined {
  const raw = form.get("produtos");
  if (raw == null || raw === "") return undefined;
  if (typeof raw !== "string") {
    throw new Error("produtos deve ser uma lista.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido.");
  }
  return parseProdutos(parsed);
}

async function fromJson(request: Request): Promise<DeclaracaoRequest> {
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
  return { rows: raw, produtos: produtosFromBody(body) };
}

async function fromMultipart(request: Request): Promise<DeclaracaoRequest> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new Error(
      "Não foi possível ler o formulário (envie multipart/form-data).",
    );
  }

  const produtos = produtosFromForm(form);
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new Error("Envie o arquivo do lote no campo file.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("O arquivo deve ser .xlsx.");
  }

  return { rows: await parseLoteBuffer(await file.arrayBuffer()), produtos };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    const { rows, produtos } = contentType.includes("application/json")
      ? await fromJson(request)
      : await fromMultipart(request);

    const arquivo = await generateDeclaracoesFromRows(rows, produtos);
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
