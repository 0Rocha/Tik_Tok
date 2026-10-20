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
});

describe("sanitizeFilename", () => {
  it("remove caracteres inválidos e limita tamanho", () => {
    expect(sanitizeFilename("TURBIA RIBEIRO / DE SANTANA?.xlsx")).toBe(
      "TURBIA RIBEIRO DE SANTANA.xlsx",
    );
    expect(sanitizeFilename("")).toBe("declaracao.xlsx");
  });
});
