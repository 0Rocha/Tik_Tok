import { describe, expect, it } from "vitest";
import { hydrateLote, serializeLote } from "./persist";
import type { LoteItem } from "./types";

const item: LoteItem = {
  id: "abc",
  usuario: "u1",
  nome: "Nome",
  cpf: "123.456.789-00",
  endereco: "Rua 1",
  solicitante: "",
  data: "",
  valor: null,
  envio: "",
  codigoRastreio: "",
  correio: null,
};

describe("persistLote", () => {
  it("serializa e reidrata o lote intacto (schema v2)", () => {
    const raw = serializeLote([item]);
    expect(JSON.parse(raw).version).toBe(2);
    const result = hydrateLote(raw);
    expect(result).toEqual({ ok: true, lote: [item] });
  });

  it("descarta JSON inválido ou schema antigo", () => {
    expect(hydrateLote("not-json").ok).toBe(false);
    expect(hydrateLote("{}").ok).toBe(false);
    expect(hydrateLote('{"version":1,"items":[]}').ok).toBe(false);
    expect(hydrateLote('{"version":2,"items":[{"id":"x"}]}').ok).toBe(false);
  });

  it("aceita lote vazio válido", () => {
    const raw = serializeLote([]);
    expect(hydrateLote(raw)).toEqual({ ok: true, lote: [] });
  });
});
