import ExcelJS from "exceljs";
import { XLSX_HEADERS, type XlsxRow } from "@/lib/domain/types";

export type LoteParseRow = XlsxRow;

function cellText(value: ExcelJS.CellValue): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return "";
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value && value.result != null) {
      return cellText(value.result as ExcelJS.CellValue);
    }
  }
  return String(value).trim();
}

function cellDateIso(value: ExcelJS.CellValue): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) {
      return `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
    }
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return cellDateIso(value.result as ExcelJS.CellValue);
  }
  return "";
}

function cellMoney(value: ExcelJS.CellValue): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value
      .replace(/R\$\s?/gi, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return cellMoney(value.result as ExcelJS.CellValue);
  }
  return null;
}

function isRowEmpty(values: ExcelJS.CellValue[]): boolean {
  return values.every((v) => cellText(v) === "" && cellDateIso(v) === "" && cellMoney(v) == null);
}

export async function parseLoteBuffer(buffer: ArrayBuffer): Promise<LoteParseRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) {
    throw new Error("Planilha vazia: nenhuma aba encontrada.");
  }

  const headerRow = sheet.getRow(1);
  const headers = XLSX_HEADERS.map((_, i) => cellText(headerRow.getCell(i + 1).value));
  const mismatch = XLSX_HEADERS.some((expected, i) => headers[i] !== expected);
  if (mismatch) {
    throw new Error(
      `Cabeçalho inválido. Esperado: ${XLSX_HEADERS.join(", ")}.`,
    );
  }

  const rows: LoteParseRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = XLSX_HEADERS.map((_, i) => row.getCell(i + 1).value);
    if (isRowEmpty(values)) return;

    const parsed: LoteParseRow = {
      solicitante: cellText(values[0]),
      data: cellDateIso(values[1]),
      usuario: cellText(values[2]),
      nome: cellText(values[3]),
      cpf: cellText(values[4]),
      endereco: cellText(values[5]),
      valor: cellMoney(values[6]),
      envio: cellDateIso(values[7]),
      codigoRastreio: cellText(values[8]),
      correio: cellMoney(values[9]),
    };

    const missing: string[] = [];
    if (!parsed.nome) missing.push("Nome");
    if (!parsed.cpf) missing.push("CPF");
    if (!parsed.endereco) missing.push("Endereço");
    if (missing.length) {
      throw new Error(`Linha ${rowNumber}: faltam campos obrigatórios (${missing.join(", ")}).`);
    }

    rows.push(parsed);
  });

  if (rows.length === 0) {
    throw new Error("Lote vazio: nenhuma linha de dados encontrada.");
  }

  return rows;
}
