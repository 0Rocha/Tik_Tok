import { describe, expect, it } from "vitest";
import {
  addItem,
  createEmptyLote,
  findDuplicateUsuarios,
  removeItem,
  updateItem,
} from "./lote";
import type { LoteItem } from "./types";

function sample(partial: Partial<LoteItem> & Pick<LoteItem, "usuario">): Omit<LoteItem, "id"> {
  return {
    usuario: partial.usuario,
    nome: partial.nome ?? "Nome",
    cpf: partial.cpf ?? "123.456.789-00",
    endereco: partial.endereco ?? "Rua 1",
    solicitante: partial.solicitante ?? "Sol",
    data: partial.data ?? "2026-10-20",
    valor: partial.valor ?? 10,
    envio: partial.envio ?? "2026-10-21",
    codigoRastreio: partial.codigoRastreio ?? "AB1",
    correio: partial.correio ?? 5,
  };
}

describe("loteManager", () => {
  it("adiciona item com id interno estável e distinto", () => {
    let lote = createEmptyLote();
    const first = addItem(lote, sample({ usuario: "u1" }));
    lote = first.lote;
    const second = addItem(lote, sample({ usuario: "u2" }));
    expect(first.item.id).toBeTruthy();
    expect(second.item.id).toBeTruthy();
    expect(first.item.id).not.toBe(second.item.id);
    expect(second.lote).toHaveLength(2);
  });

  it("edita item pelo id sem alterar os demais", () => {
    let lote = createEmptyLote();
    const a = addItem(lote, sample({ usuario: "u1" }));
    lote = a.lote;
    const b = addItem(lote, sample({ usuario: "u2" }));
    lote = b.lote;
    lote = updateItem(lote, a.item.id, { ...a.item, nome: "Novo Nome" });
    expect(lote.find((i) => i.id === a.item.id)?.nome).toBe("Novo Nome");
    expect(lote.find((i) => i.id === b.item.id)?.usuario).toBe("u2");
  });

  it("remove item pelo id", () => {
    let lote = createEmptyLote();
    const a = addItem(lote, sample({ usuario: "u1" }));
    lote = a.lote;
    const b = addItem(lote, sample({ usuario: "u2" }));
    lote = removeItem(b.lote, a.item.id);
    expect(lote).toHaveLength(1);
    expect(lote[0]?.usuario).toBe("u2");
  });

  it("sinaliza duplicidade por usuario sem bloquear", () => {
    let lote = createEmptyLote();
    lote = addItem(lote, sample({ usuario: "u1" })).lote;
    const dup = findDuplicateUsuarios(lote, "u1");
    expect(dup).toEqual(["u1"]);
    const next = addItem(lote, sample({ usuario: "u1" }));
    expect(next.lote).toHaveLength(2);
  });
});
