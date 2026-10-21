import { describe, expect, it } from "vitest";
import type { XlsxRow } from "@/lib/domain/types";
import {
  assertValidLoteRows,
  generateDeclaracoesFromRows,
} from "./generate-from-rows";

const baseRow = (): XlsxRow => ({
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
});

describe("assertValidLoteRows", () => {
  it("aceita rows com nome, CPF e endereço", () => {
    expect(() => assertValidLoteRows([baseRow()])).not.toThrow();
  });

  it("rejeita lote vazio", () => {
    expect(() => assertValidLoteRows([])).toThrow(/lote vazio/i);
  });

  it("rejeita linha sem campos obrigatórios", () => {
    expect(() =>
      assertValidLoteRows([{ ...baseRow(), nome: "", cpf: "" }]),
    ).toThrow(/linha 1.*Nome.*CPF/i);
  });
});

describe("generateDeclaracoesFromRows", () => {
  it("devolve um xlsx quando há uma pessoa", async () => {
    const arquivo = await generateDeclaracoesFromRows([
      { ...baseRow(), nome: "Rafael Silveira" },
    ]);
    expect(arquivo.kind).toBe("xlsx");
    expect(arquivo.filename).toBe("Rafael Silveira.xlsx");
    expect(arquivo.count).toBe(1);
    expect(arquivo.bytes.byteLength).toBeGreaterThan(100);
  });

  it("devolve zip quando há mais de uma pessoa", async () => {
    const arquivo = await generateDeclaracoesFromRows([
      baseRow(),
      { ...baseRow(), nome: "Ana", usuario: "u2" },
    ]);
    expect(arquivo.kind).toBe("zip");
    expect(arquivo.filename).toMatch(/\.zip$/);
    expect(arquivo.count).toBe(2);
  });
});
