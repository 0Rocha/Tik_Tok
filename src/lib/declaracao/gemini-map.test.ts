import { describe, expect, it } from "vitest";
import { mapLoteRowDeterministic } from "./fallback-map";
import { mapLoteRowWithGemini } from "./gemini-map";
import type { LoteParseRow } from "./parse-lote";

/** Garante que o fallback (usado quando Gemini falha) cobre o contrato do JSON. */
describe("contrato DeclaracaoDestinatario (fallback = seam Gemini)", () => {
  const row: LoteParseRow = {
    solicitante: "S",
    data: "2026-10-19",
    usuario: "u",
    nome: "Nome Completo",
    cpf: "12345678900",
    endereco: "Rua A, 1 - Bairro B - Cidade/SC - 88000-000",
    valor: 10,
    envio: "",
    codigoRastreio: "",
    correio: null,
  };

  it("produz todas as chaves esperadas pelo fill-template", () => {
    const mapped = mapLoteRowDeterministic(row);
    expect(Object.keys(mapped).sort()).toEqual([
      "bairro",
      "cep",
      "cidade",
      "cpf",
      "dataExtenso",
      "endereco",
      "fone",
      "nome",
      "uf",
    ]);
    expect(mapped.fone).toBe("");
  });

  it("não chama Gemini quando o endereço já está no padrão Luci", async () => {
    const mapped = await mapLoteRowWithGemini(row, {
      apiKey: "",
      now: new Date(2026, 9, 20),
    });
    expect(mapped).toEqual(
      mapLoteRowDeterministic(row, new Date(2026, 9, 20)),
    );
    expect(mapped.cidade).toBe("Cidade");
    expect(mapped.uf).toBe("SC");
  });
});
