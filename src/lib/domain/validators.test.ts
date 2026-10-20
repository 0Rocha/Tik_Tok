import { describe, expect, it } from "vitest";
import {
  formatDateBr,
  parseDateBr,
  parseMoneyBr,
  validateLoteItem,
  validateManualFields,
} from "./validators";

describe("parseDateBr / formatDateBr", () => {
  it("converte DD/MM/AAAA para ISO YYYY-MM-DD", () => {
    expect(parseDateBr("20/10/2026")).toEqual({ ok: true, value: "2026-10-20" });
  });

  it("rejeita data inválida", () => {
    expect(parseDateBr("32/13/2026").ok).toBe(false);
    expect(parseDateBr("20-10-2026").ok).toBe(false);
  });

  it("formata ISO de volta para DD/MM/AAAA", () => {
    expect(formatDateBr("2026-10-20")).toBe("20/10/2026");
  });
});

describe("parseMoneyBr", () => {
  it("aceita reais com vírgula", () => {
    expect(parseMoneyBr("12,50")).toEqual({ ok: true, value: 12.5 });
  });

  it("aceita milhar com ponto e decimal com vírgula", () => {
    expect(parseMoneyBr("1.234,56")).toEqual({ ok: true, value: 1234.56 });
  });

  it("rejeita valor inválido; vazio fica para o caller opcional", () => {
    expect(parseMoneyBr("").ok).toBe(false);
    expect(parseMoneyBr("abc").ok).toBe(false);
  });
});

describe("validateManualFields", () => {
  it("aceita os seis campos manuais válidos", () => {
    const result = validateManualFields({
      solicitante: "Maria",
      data: "20/10/2026",
      valor: "10,00",
      envio: "21/10/2026",
      codigoRastreio: "AB123456789BR",
      correio: "15,90",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        solicitante: "Maria",
        data: "2026-10-20",
        valor: 10,
        envio: "2026-10-21",
        codigoRastreio: "AB123456789BR",
        correio: 15.9,
      },
    });
  });

  it("aceita todos os manuais vazios", () => {
    const result = validateManualFields({
      solicitante: "",
      data: "",
      valor: "",
      envio: "",
      codigoRastreio: "",
      correio: "",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        solicitante: "",
        data: "",
        valor: null,
        envio: "",
        codigoRastreio: "",
        correio: null,
      },
    });
  });

  it("rejeita data preenchida inválida", () => {
    const result = validateManualFields({
      solicitante: "",
      data: "99/99/9999",
      valor: "",
      envio: "",
      codigoRastreio: "",
      correio: "",
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateLoteItem", () => {
  it("exige usuario, nome, endereco e cpf", () => {
    const result = validateLoteItem({
      id: "x",
      usuario: "",
      nome: "",
      cpf: "",
      endereco: "",
      solicitante: "",
      data: "",
      valor: null,
      envio: "",
      codigoRastreio: "",
      correio: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Usuário é obrigatório.",
          "Nome é obrigatório.",
          "Endereço é obrigatório.",
          "CPF é obrigatório.",
        ]),
      );
    }
  });

  it("aceita item só com os quatro obrigatórios", () => {
    const result = validateLoteItem({
      id: "1",
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
    });
    expect(result).toEqual({ ok: true });
  });
});
