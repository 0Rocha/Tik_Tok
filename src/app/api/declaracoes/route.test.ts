import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { XlsxRow } from "@/lib/domain/types";
import { POST } from "./route";

const row: XlsxRow = {
  solicitante: "",
  data: "",
  usuario: "u1",
  nome: "Maria",
  cpf: "123",
  endereco: "Rua A, 10 - Centro - Cidade/SC - 88000-000",
  valor: null,
  envio: "",
  codigoRastreio: "",
  correio: null,
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/declaracoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/declaracoes produtos", () => {
  it("recusa lista vazia", async () => {
    const res = await POST(jsonRequest({ rows: [row], produtos: [] }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/1 a 12 produtos/i);
  });

  it("recusa mais de 12 produtos", async () => {
    const res = await POST(
      jsonRequest({
        rows: [row],
        produtos: Array.from({ length: 13 }, () => ({
          quantidade: 1,
          nome: "Item",
          valor: 1,
        })),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("recusa produtos inválidos no formulário", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1])], "lote.xlsx"));
    form.set("produtos", "[]");
    const res = await POST(
      new Request("http://localhost/api/declaracoes", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/1 a 12 produtos/i);
  });

  it("grava a lista enviada na declaração", async () => {
    const res = await POST(
      jsonRequest({
        rows: [row],
        produtos: [{ quantidade: 1, nome: "Sabonete", valor: 10 }],
      }),
    );
    expect(res.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await res.arrayBuffer());
    const ws = wb.getWorksheet("Plan2");
    expect(String(ws?.getCell("C18").value)).toBe("Sabonete");
    expect(String(ws?.getCell("C19").value ?? "")).toBe("");
    expect(String(ws?.getCell("J30").value)).toBe("R$ 10,00");
  });
});
