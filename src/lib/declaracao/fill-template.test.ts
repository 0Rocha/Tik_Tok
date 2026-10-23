import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { DeclaracaoDestinatario } from "./fallback-map";
import { fillDeclaracaoTemplate, sanitizeFilename } from "./fill-template";

const TEMPLATE = path.resolve(
  process.cwd(),
  "templates/declaracao-conteudo.xlsx",
);

const dest: DeclaracaoDestinatario = {
  nome: "FULANO DE TAL",
  cpf: "123.456.789-00",
  fone: "",
  endereco: "RUA TESTE, 100",
  bairro: "CENTRO",
  cidade: "SALVADOR",
  uf: "BA",
  cep: "40000-000",
  dataExtenso: "CAMBORIÚ, 20 DE OUTUBRO DE 2026,",
};

describe("fillDeclaracaoTemplate", () => {
  it("preenche destinatário e preserva remetente, produtos e textbox DECLARAÇÃO", async () => {
    const template = fs.readFileSync(TEMPLATE);
    const buffer = await fillDeclaracaoTemplate(template, dest);

    const zip = await JSZip.loadAsync(buffer);
    const drawing = await zip.file("xl/drawings/drawing1.xml")?.async("string");
    expect(drawing).toBeTruthy();
    expect(drawing!).toContain("Declaro,");
    expect(drawing!).toMatch(/Lei Complementar/i);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.getWorksheet("Plan2");
    expect(ws).toBeTruthy();

    expect(String(ws!.getCell("C6").value)).toContain("LUCIANE");
    expect(String(ws!.getCell("C18").value)).toMatch(/Luva/i);
    expect(String(ws!.getCell("C11").value)).toBe("FULANO DE TAL");
    expect(String(ws!.getCell("C12").value)).toBe("123.456.789-00");
    expect(String(ws!.getCell("C13").value)).toBe("RUA TESTE, 100");
    expect(String(ws!.getCell("H13").value)).toBe("CENTRO");
    expect(String(ws!.getCell("C14").value)).toBe("SALVADOR");
    expect(String(ws!.getCell("H14").value)).toBe("BA");
    expect(String(ws!.getCell("J14").value).trim()).toBe("40000-000");
    expect(String(ws!.getCell("I11").value ?? "")).toBe("");
    expect(String(ws!.getCell("A41").value)).toContain("CAMBORIÚ, 20 DE OUTUBRO");
    expect(String(ws!.getCell("H8").value)).toMatch(/SANTA REGINA/i);
  });

  it("substitui os produtos marcados, limpa o resto e soma o total", async () => {
    const template = fs.readFileSync(TEMPLATE);
    const buffer = await fillDeclaracaoTemplate(template, dest, [
      { quantidade: 2, nome: "Luva de Silicone", valor: 14.5 },
      { quantidade: 1, nome: "A & B", valor: 1.5 },
    ]);

    const zip = await JSZip.loadAsync(buffer);
    const drawing = await zip.file("xl/drawings/drawing1.xml")?.async("string");
    expect(drawing).toContain("Declaro,");

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.getWorksheet("Plan2")!;

    expect(cellText(ws.getCell("C6").value)).toContain("LUCIANE");
    expect(cellText(ws.getCell("C11").value)).toBe("FULANO DE TAL");
    expect(ws.getCell("A18").value).toBe(2);
    expect(cellText(ws.getCell("C18").value)).toBe("Luva de Silicone");
    expect(cellText(ws.getCell("J18").value)).toBe("R$ 14,50");
    expect(ws.getCell("A19").value).toBe(1);
    expect(cellText(ws.getCell("C19").value)).toBe("A & B");
    expect(cellText(ws.getCell("J19").value)).toBe("R$ 1,50");
    expect(cellText(ws.getCell("A20").value)).toBe("");
    expect(cellText(ws.getCell("C20").value)).toBe("");
    expect(cellText(ws.getCell("J20").value)).toBe("");
    expect(cellText(ws.getCell("C29").value)).toBe("");
    expect(cellText(ws.getCell("J25").value)).toBe("");
    expect(cellText(ws.getCell("J30").value)).toBe("R$ 16,00");
    expect(cellText(ws.getCell("A30").value)).toMatch(/VALOR TOTAL/i);
  });
});

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && "richText" in value && value.richText) {
    return value.richText.map((part) => part.text).join("");
  }
  return String(value);
}

describe("sanitizeFilename", () => {
  it("remove caracteres inválidos e limita tamanho", () => {
    expect(sanitizeFilename("TURBIA RIBEIRO / DE SANTANA?.xlsx")).toBe(
      "TURBIA RIBEIRO DE SANTANA.xlsx",
    );
    expect(sanitizeFilename("")).toBe("declaracao.xlsx");
  });
});
