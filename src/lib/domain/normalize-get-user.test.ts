import { describe, expect, it } from "vitest";
import { composeEndereco, normalizeGetUser } from "./normalize-get-user";

const enderecoExemplo = {
  cep: "12345-000",
  estado: "SP",
  cidade: "Sorocaba",
  bairro: "Centro",
  endereco: "Rua abcd",
  numero: "123",
  complemento: "Casa",
  pais: "Brazil",
};

describe("composeEndereco", () => {
  it("monta string a partir das partes da API", () => {
    expect(
      composeEndereco({
        cep: "01001-000",
        estado: "SP",
        cidade: "São Paulo",
        bairro: "Sé",
        endereco: "Praça da Sé",
        numero: "100",
        complemento: "Sala 1",
        pais: "Brasil",
      }),
    ).toBe("Praça da Sé, 100, Sala 1 - Sé - São Paulo/SP - 01001-000");
  });

  it("omite partes vazias", () => {
    expect(
      composeEndereco({
        cep: "90000-000",
        estado: "RS",
        cidade: "Porto Alegre",
        bairro: "Centro",
        endereco: "Rua A",
        numero: "10",
        complemento: "",
        pais: "Brasil",
      }),
    ).toBe("Rua A, 10 - Centro - Porto Alegre/RS - 90000-000");
  });
});

describe("normalizeGetUser", () => {
  it("prioriza campo cpf da API (exemplo de documentação)", () => {
    expect(
      normalizeGetUser({
        usuario: "admin",
        nome: "Jhon Doe",
        cpf: "123.123.123-12",
        cnpj: "não-usar",
        endereco: enderecoExemplo,
      }),
    ).toEqual({
      ok: true,
      value: {
        usuario: "admin",
        nome: "Jhon Doe",
        cpf: "123.123.123-12",
        endereco:
          "Rua abcd, 123, Casa - Centro - Sorocaba/SP - 12345-000",
      },
      incomplete: false,
    });
  });

  it("usa cnpj como fallback quando cpf ausente", () => {
    expect(
      normalizeGetUser({
        usuario: "dist123",
        nome: "Maria Silva",
        cnpj: "12.345.678/0001-90",
        endereco: {
          cep: "90000-000",
          estado: "RS",
          cidade: "Porto Alegre",
          bairro: "Centro",
          endereco: "Rua A",
          numero: "10",
          complemento: "",
          pais: "Brasil",
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        usuario: "dist123",
        nome: "Maria Silva",
        cpf: "12.345.678/0001-90",
        endereco: "Rua A, 10 - Centro - Porto Alegre/RS - 90000-000",
      },
      incomplete: false,
    });
  });

  it("falha quando usuario ausente", () => {
    expect(normalizeGetUser({ nome: "X" }).ok).toBe(false);
  });

  it("marca incomplete se nome, endereco ou cpf faltarem", () => {
    expect(
      normalizeGetUser({
        usuario: "u1",
        nome: "N",
        cpf: "",
        cnpj: "",
        endereco: enderecoExemplo,
      }),
    ).toMatchObject({ ok: true, incomplete: true });
  });
});
