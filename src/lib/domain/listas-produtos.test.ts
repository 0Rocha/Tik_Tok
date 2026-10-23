import { describe, expect, it } from "vitest";
import {
  createDefaultListasState,
  createListaAtual,
  hydrateListas,
  parseProdutos,
  produtosSelecionados,
  serializeListas,
  somaValores,
  type ListasProdutosState,
} from "./listas-produtos";

describe("persistListas", () => {
  it("serializa e reidrata listas e a seleção", () => {
    const state = createDefaultListasState();
    const raw = serializeListas(state);
    expect(JSON.parse(raw).version).toBe(1);
    expect(hydrateListas(raw)).toEqual({ ok: true, state });
  });

  it("aceita rascunho com nome de produto vazio e lista sem seleção", () => {
    const state: ListasProdutosState = {
      listas: [
        {
          id: "nova",
          nome: "Kit novembro",
          itens: [{ quantidade: 1, nome: "", valor: 0 }],
        },
      ],
      selecionadaId: null,
    };
    expect(hydrateListas(serializeListas(state))).toEqual({ ok: true, state });
  });

  it("zera a seleção quando o id marcado não existe mais", () => {
    const lista = createListaAtual();
    const raw = serializeListas({ listas: [lista], selecionadaId: "sumiu" });
    expect(hydrateListas(raw)).toEqual({
      ok: true,
      state: { listas: [lista], selecionadaId: null },
    });
  });

  it("descarta JSON inválido, schema antigo e item inválido", () => {
    expect(hydrateListas("not-json").ok).toBe(false);
    expect(hydrateListas("{}").ok).toBe(false);
    expect(hydrateListas('{"version":2,"listas":[],"selecionadaId":null}').ok).toBe(
      false,
    );
    expect(
      hydrateListas(
        JSON.stringify({
          version: 1,
          listas: [
            {
              id: "a",
              nome: "A",
              itens: [{ quantidade: 0, nome: "X", valor: 1 }],
            },
          ],
          selecionadaId: "a",
        }),
      ).ok,
    ).toBe(false);
  });
});

describe("parseProdutos", () => {
  it("recusa lista vazia, lista longa e nome em branco", () => {
    expect(() => parseProdutos([])).toThrow(/1 a 12 produtos/i);
    expect(() =>
      parseProdutos(
        Array.from({ length: 13 }, () => ({
          quantidade: 1,
          nome: "Item",
          valor: 1,
        })),
      ),
    ).toThrow(/1 a 12 produtos/i);
    expect(() => parseProdutos([{ quantidade: 1, nome: "  ", valor: 1 }])).toThrow(
      /nome é obrigatório/i,
    );
  });

  it("soma os valores sem multiplicar a quantidade", () => {
    expect(
      somaValores([
        { valor: 14.5 },
        { valor: 1.5 },
      ]),
    ).toBe(16);
  });
});

describe("produtosSelecionados", () => {
  it("exige uma lista marcada com itens válidos", () => {
    const lista = createListaAtual();
    expect(
      produtosSelecionados({ listas: [lista], selecionadaId: null }).ok,
    ).toBe(false);
    const ok = produtosSelecionados({
      listas: [lista],
      selecionadaId: lista.id,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.produtos).toHaveLength(12);
  });
});
