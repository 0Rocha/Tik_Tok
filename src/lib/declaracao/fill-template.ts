import JSZip from "jszip";
import type { DeclaracaoDestinatario } from "./fallback-map";

/**
 * Índices de sharedStrings exclusivos do destinatário/data no template
 * (Plan2 / sheet1). Não alterar outros índices — remetente e produtos dependem deles.
 */
const SI = {
  nome: 24,
  cpf: 25,
  endereco: 26,
  bairro: 27,
  cidade: 28,
  uf: 30,
  cep: 31,
  data: 59,
} as const;

const SHEET_PATH = "xl/worksheets/sheet1.xml";
const SHARED_STRINGS_PATH = "xl/sharedStrings.xml";
const DRAWING_PATH = "xl/drawings/drawing1.xml";

export const DECLARACAO_CELLS = {
  nome: "C11",
  fone: "I11",
  cpf: "C12",
  endereco: "C13",
  bairro: "H13",
  cidade: "C14",
  uf: "H14",
  cep: "J14",
  data: "A41",
} as const;

export function sanitizeFilename(nome: string): string {
  const base = nome
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  if (!base) return "declaracao.xlsx";
  return base.toLowerCase().endsWith(".xlsx") ? base : `${base}.xlsx`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setSharedStringAt(
  sharedStringsXml: string,
  index: number,
  text: string,
): string {
  const siBlocks = sharedStringsXml.match(/<si>[\s\S]*?<\/si>/g);
  if (!siBlocks || index < 0 || index >= siBlocks.length) {
    throw new Error(
      `sharedStrings: índice ${index} inválido (total ${siBlocks?.length ?? 0}).`,
    );
  }

  const needsPreserve = text !== text.trim() || /\s{2,}/.test(text);
  const tAttr = needsPreserve ? ' xml:space="preserve"' : "";
  const replacement = `<si><t${tAttr}>${escapeXml(text)}</t></si>`;

  let i = 0;
  return sharedStringsXml.replace(/<si>[\s\S]*?<\/si>/g, (block) =>
    i++ === index ? replacement : block,
  );
}

function clearFoneCell(sheetXml: string): string {
  // Template original guarda telefone como número; limpar sem shared string.
  const replaced = sheetXml.replace(
    /<c r="I11"[^>]*>[\s\S]*?<\/c>/,
    `<c r="I11" s="37" t="inlineStr"><is><t/></is></c>`,
  );
  if (replaced === sheetXml) {
    throw new Error("Célula I11 (fone) não encontrada no template.");
  }
  return replaced;
}

function toBuffer(
  input: Buffer | ArrayBuffer | Uint8Array,
): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;
  if (Buffer.isBuffer(input)) {
    return input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength,
    ) as ArrayBuffer;
  }
  return input.buffer.slice(
    input.byteOffset,
    input.byteOffset + input.byteLength,
  ) as ArrayBuffer;
}

/**
 * Preenche destinatário/data no template OOXML sem reescrever o workbook
 * (preserva textboxes em xl/drawings — parágrafo DECLARAÇÃO + I/II).
 */
export async function fillDeclaracaoTemplate(
  templateBytes: Buffer | ArrayBuffer | Uint8Array,
  dest: DeclaracaoDestinatario,
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(toBuffer(templateBytes));

  const ssFile = zip.file(SHARED_STRINGS_PATH);
  const sheetFile = zip.file(SHEET_PATH);
  if (!ssFile || !sheetFile) {
    throw new Error("Template inválido: sharedStrings ou sheet1 ausente.");
  }

  let shared = await ssFile.async("string");
  const dataText = dest.dataExtenso.startsWith(" ")
    ? dest.dataExtenso
    : `  ${dest.dataExtenso}`;
  const cepText = dest.cep ? ` ${dest.cep}` : "";

  shared = setSharedStringAt(shared, SI.nome, dest.nome);
  shared = setSharedStringAt(shared, SI.cpf, dest.cpf);
  shared = setSharedStringAt(shared, SI.endereco, dest.endereco);
  shared = setSharedStringAt(shared, SI.bairro, dest.bairro);
  shared = setSharedStringAt(shared, SI.cidade, dest.cidade);
  shared = setSharedStringAt(shared, SI.uf, dest.uf);
  shared = setSharedStringAt(shared, SI.cep, cepText);
  shared = setSharedStringAt(shared, SI.data, dataText);

  let sheet = await sheetFile.async("string");
  sheet = clearFoneCell(sheet);

  zip.file(SHARED_STRINGS_PATH, shared);
  zip.file(SHEET_PATH, sheet);

  // Garantia: drawings intactos
  if (!zip.file(DRAWING_PATH)) {
    throw new Error(
      "Template sem drawing1.xml — o texto da DECLARAÇÃO seria perdido.",
    );
  }

  const out = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
  });
  return out;
}
