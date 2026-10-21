import fs from "node:fs/promises";
import type { XlsxRow } from "@/lib/domain/types";
import { buildDeclaracoesZip, declaracaoFilenames } from "./build-zip";
import { fillDeclaracaoTemplate } from "./fill-template";
import { mapLoteRowsWithGemini } from "./gemini-map";
import { getDeclaracaoTemplatePath } from "./template-path";

export type DeclaracoesArquivo = {
  kind: "xlsx" | "zip";
  filename: string;
  bytes: Buffer;
  count: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function declaracoesZipFilename(now = new Date()): string {
  return `declaracoes-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.zip`;
}

/** Valida nome/CPF/endereço por linha (mesmo critério do parse do XLSX). */
export function assertValidLoteRows(rows: XlsxRow[]): void {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Lote vazio: nenhuma linha de dados encontrada.");
  }

  rows.forEach((row, index) => {
    const missing: string[] = [];
    if (!row.nome?.trim()) missing.push("Nome");
    if (!row.cpf?.trim()) missing.push("CPF");
    if (!row.endereco?.trim()) missing.push("Endereço");
    if (missing.length) {
      throw new Error(
        `Linha ${index + 1}: faltam campos obrigatórios (${missing.join(", ")}).`,
      );
    }
  });
}

export async function generateDeclaracoesFromRows(
  rows: XlsxRow[],
): Promise<DeclaracoesArquivo> {
  assertValidLoteRows(rows);
  const destinatarios = await mapLoteRowsWithGemini(rows);
  const template = await fs.readFile(getDeclaracaoTemplatePath());

  if (destinatarios.length === 1) {
    const dest = destinatarios[0]!;
    const xlsx = await fillDeclaracaoTemplate(template, dest);
    return {
      kind: "xlsx",
      filename: declaracaoFilenames([dest.nome])[0]!,
      bytes: Buffer.from(xlsx),
      count: 1,
    };
  }

  const zip = await buildDeclaracoesZip(template, destinatarios);
  return {
    kind: "zip",
    filename: declaracoesZipFilename(),
    bytes: zip,
    count: destinatarios.length,
  };
}
