import { describe, expect, it } from "vitest";
import {
  enderecoNoPadraoLuci,
  formatDataExtenso,
  mapLoteRowDeterministic,
  parseLuciEndereco,
} from "./fallback-map";

describe("parseLuciEndereco", () => {
  it("separa logradouro, bairro, cidade/UF e CEP no formato Luci", () => {
    expect(
      parseLuciEndereco(
        "RUA ITORORÓ, 8882, CONDOMONIO CENTRAL PARK - RUA NOVA - FEIRA DE SANTANA/BA - 44023-074",
      ),
    ).toEqual({
      endereco: "RUA ITORORÓ, 8882, CONDOMONIO CENTRAL PARK",
      bairro: "RUA NOVA",
      cidade: "FEIRA DE SANTANA",
      uf: "BA",
      cep: "44023-074",
    });
  });

  it("devolve endereço bruto quando o formato não bate", () => {
    expect(parseLuciEndereco("Só uma linha sem padrão")).toEqual({
      endereco: "Só uma linha sem padrão",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
    });
  });
});

describe("enderecoNoPadraoLuci", () => {
  it("reconhece cidade, UF e CEP já separados", () => {
    expect(
      enderecoNoPadraoLuci(
        "Avenida Santos Dumont, 513 - Vila Junção - RIO GRANDE/RS - 96202-090",
      ),
    ).toBe(true);
  });

  it("recusa endereço sem o padrão", () => {
    expect(enderecoNoPadraoLuci("Só uma linha sem padrão")).toBe(false);
  });
});

describe("formatDataExtenso", () => {
  it("formata ISO como data por extenso em Camboriú", () => {
    expect(formatDataExtenso("2026-10-19")).toBe(
      "CAMBORIÚ, 19 DE OUTUBRO DE 2026,",
    );
  });

  it("usa data de hoje quando ISO vazio", () => {
    const result = formatDataExtenso("", new Date(2026, 9, 20));
    expect(result).toBe("CAMBORIÚ, 20 DE OUTUBRO DE 2026,");
  });
});

describe("mapLoteRowDeterministic", () => {
  it("monta destinatário a partir do lote sem inventar fone", () => {
    const mapped = mapLoteRowDeterministic({
      solicitante: "",
      data: "2026-10-19",
      usuario: "u",
      nome: "TURBIA RIBEIRO DE SANTANA",
      cpf: "05161650540",
      endereco:
        "RUA ITORORÓ, 8882 - RUA NOVA - FEIRA DE SANTANA/BA - 44023-074",
      valor: null,
      envio: "",
      codigoRastreio: "",
      correio: null,
    });
    expect(mapped.fone).toBe("");
    expect(mapped.nome).toBe("TURBIA RIBEIRO DE SANTANA");
    expect(mapped.cidade).toBe("FEIRA DE SANTANA");
    expect(mapped.uf).toBe("BA");
    expect(mapped.dataExtenso).toBe("CAMBORIÚ, 19 DE OUTUBRO DE 2026,");
    expect(mapped.cpf).toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  });

  it("prioriza Data e cai para Envio", () => {
    const mapped = mapLoteRowDeterministic({
      solicitante: "",
      data: "",
      usuario: "u",
      nome: "A",
      cpf: "11111111111",
      endereco: "Rua - Bairro - Cidade/SP - 01000-000",
      valor: null,
      envio: "2026-11-01",
      codigoRastreio: "",
      correio: null,
    });
    expect(mapped.dataExtenso).toBe("CAMBORIÚ, 01 DE NOVEMBRO DE 2026,");
  });
});
