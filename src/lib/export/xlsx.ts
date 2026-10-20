import ExcelJS from "exceljs";
import { mapLoteToXlsxRows, XLSX_HEADERS } from "@/lib/domain/export-mapper";
import type { LoteItem } from "@/lib/domain/types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function buildExportFilename(now = new Date()): string {
  return `lote-envio-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
}

function isoToExcelDate(iso: string): Date | "" {
  if (!iso.trim()) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export async function buildLoteWorkbook(lote: LoteItem[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TikTok Envio";
  const sheet = workbook.addWorksheet("Lote");

  sheet.addRow([...XLSX_HEADERS]);
  sheet.getRow(1).font = { bold: true };

  const rows = mapLoteToXlsxRows(lote);
  for (const row of rows) {
    const excelRow = sheet.addRow([
      row.solicitante,
      isoToExcelDate(row.data),
      row.usuario,
      row.nome,
      row.cpf,
      row.endereco,
      row.valor ?? "",
      isoToExcelDate(row.envio),
      row.codigoRastreio,
      row.correio ?? "",
    ]);

    // Colunas: 1 Solicitante, 2 Data, 3 Usuário, 4 Nome, 5 CPF, 6 Endereço,
    // 7 Valor, 8 Envio, 9 Rastreio, 10 Correio
    if (row.data) excelRow.getCell(2).numFmt = "dd/mm/yyyy";
    excelRow.getCell(5).numFmt = "@";
    excelRow.getCell(6).alignment = { wrapText: true };
    if (row.valor != null) excelRow.getCell(7).numFmt = '"R$"#,##0.00';
    if (row.envio) excelRow.getCell(8).numFmt = "dd/mm/yyyy";
    excelRow.getCell(9).numFmt = "@";
    if (row.correio != null) excelRow.getCell(10).numFmt = '"R$"#,##0.00';
  }

  sheet.columns = [
    { width: 18 },
    { width: 12 },
    { width: 14 },
    { width: 22 },
    { width: 16 },
    { width: 40 },
    { width: 12 },
    { width: 12 },
    { width: 20 },
    { width: 12 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export async function downloadLoteXlsx(lote: LoteItem[]): Promise<void> {
  if (lote.length === 0) {
    throw new Error("Lote vazio: nada para exportar.");
  }
  const buffer = await buildLoteWorkbook(lote);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildExportFilename();
  anchor.click();
  URL.revokeObjectURL(url);
}
