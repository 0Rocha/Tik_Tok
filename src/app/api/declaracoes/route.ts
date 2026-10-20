import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { buildDeclaracoesZip } from "@/lib/declaracao/build-zip";
import { mapLoteRowsWithGemini } from "@/lib/declaracao/gemini-map";
import { parseLoteBuffer } from "@/lib/declaracao/parse-lote";
import { getDeclaracaoTemplatePath } from "@/lib/declaracao/template-path";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function zipFilename(now = new Date()): string {
  return `declaracoes-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.zip`;
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o formulário (envie multipart/form-data)." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Envie o arquivo do lote no campo file." },
      { status: 400 },
    );
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "O arquivo deve ser .xlsx." },
      { status: 400 },
    );
  }

  try {
    const loteBuffer = await file.arrayBuffer();
    const rows = await parseLoteBuffer(loteBuffer);
    const destinatarios = await mapLoteRowsWithGemini(rows);
    const template = await fs.readFile(getDeclaracaoTemplatePath());
    const zip = await buildDeclaracoesZip(template, destinatarios);

    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename()}"`,
        "X-Declaracoes-Count": String(destinatarios.length),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao gerar declarações.";
    const status = /cabeçalho|lote vazio|faltam campos|linha \d+/i.test(message)
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
