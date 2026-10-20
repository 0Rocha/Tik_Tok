import { describe, expect, it } from "vitest";
import { mapLoteToXlsxRows, XLSX_COLUMN_KEYS } from "./export-mapper";
import { XLSX_HEADERS, type LoteItem } from "./types";

const item: LoteItem = {
  id: "abc",
  usuario: "u1",
  nome: "José",
  cpf: "123.456.789-00",
  endereco: "Rua A, 10\nCentro",
  solicitante: "Maria",
  data: "2026-10-20",
  valor: 12.5,
  envio: "2026-10-21",
  codigoRastreio: "AB123456789BR",
  correio: 15.9,
};

describe("mapLoteToXlsxRows", () => {
  it("mapeia na ordem oficial com CPF após Nome", () => {
    expect(XLSX_HEADERS).toEqual([
      "Solicitante",
      "Data",
      "Usuário",
      "Nome",
      "CPF",
      "Endereço",
      "Valor",
      "Envio",
      "Cód. Rastreio",
      "Correio",
    ]);
    expect(XLSX_COLUMN_KEYS).toEqual([
      "solicitante",
      "data",
      "usuario",
      "nome",
      "cpf",
      "endereco",
      "valor",
      "envio",
      "codigoRastreio",
      "correio",
    ]);
    const rows = mapLoteToXlsxRows([item]);
    expect(rows).toEqual([
      {
        solicitante: "Maria",
        data: "2026-10-20",
        usuario: "u1",
        nome: "José",
        cpf: "123.456.789-00",
        endereco: "Rua A, 10\nCentro",
        valor: 12.5,
        envio: "2026-10-21",
        codigoRastreio: "AB123456789BR",
        correio: 15.9,
      },
    ]);
  });

  it("não inclui id interno nas linhas", () => {
    const row = mapLoteToXlsxRows([item])[0];
    expect(row && "id" in row).toBe(false);
  });
});
