import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseLoteBuffer } from "./parse-lote";
import { XLSX_HEADERS } from "@/lib/domain/types";

async function buildLoteBuffer(
  rows: Array<Array<string | number | Date | null>>,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Lote");
  sheet.addRow([...XLSX_HEADERS]);
  for (const row of rows) sheet.addRow(row);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

describe("parseLoteBuffer", () => {
  it("lê linhas tipadas na ordem das colunas oficiais", async () => {
    const buf = await buildLoteBuffer([
      [
        "Maria",
        new Date(2026, 9, 20),
        "user1",
        "José Silva",
        "123.456.789-00",
        "Rua A, 10 - Centro - Cidade/SP - 01000-000",
        100.5,
        new Date(2026, 9, 21),
        "AB123",
        15.9,
      ],
    ]);

    const rows = await parseLoteBuffer(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      solicitante: "Maria",
      usuario: "user1",
      nome: "José Silva",
      cpf: "123.456.789-00",
      endereco: "Rua A, 10 - Centro - Cidade/SP - 01000-000",
      valor: 100.5,
      codigoRastreio: "AB123",
      correio: 15.9,
    });
    expect(rows[0]!.data).toBe("2026-10-20");
    expect(rows[0]!.envio).toBe("2026-10-21");
  });

  it("rejeita cabeçalho inválido", async () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Lote");
    sheet.addRow(["Nome", "CPF"]);
    sheet.addRow(["A", "1"]);
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    await expect(parseLoteBuffer(buf)).rejects.toThrow(/cabeçalho/i);
  });

  it("ignora linhas totalmente vazias", async () => {
    const buf = await buildLoteBuffer([
      [
        "",
        "",
        "u1",
        "Nome",
        "111.111.111-11",
        "Rua X - Bairro - Cidade/RJ - 20000-000",
        "",
        "",
        "",
        "",
      ],
      ["", "", "", "", "", "", "", "", "", ""],
    ]);
    const rows = await parseLoteBuffer(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.nome).toBe("Nome");
  });

  it("exige nome, cpf e endereço em cada linha", async () => {
    const buf = await buildLoteBuffer([
      ["", "", "u1", "", "111", "Rua", "", "", "", ""],
    ]);
    await expect(parseLoteBuffer(buf)).rejects.toThrow(/linha 2/i);
  });
});
