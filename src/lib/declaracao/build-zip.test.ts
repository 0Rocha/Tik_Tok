import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildDeclaracoesZip } from "./build-zip";
import type { DeclaracaoDestinatario } from "./fallback-map";

const TEMPLATE = path.resolve(
  process.cwd(),
  "templates/declaracao-conteudo.xlsx",
);

function dest(nome: string): DeclaracaoDestinatario {
  return {
    nome,
    cpf: "123.456.789-00",
    fone: "",
    endereco: "RUA X, 1",
    bairro: "CENTRO",
    cidade: "CIDADE",
    uf: "SP",
    cep: "01000-000",
    dataExtenso: "CAMBORIÚ, 20 DE OUTUBRO DE 2026,",
  };
}

describe("buildDeclaracoesZip", () => {
  it("gera um arquivo por destinatário e desambigua nomes iguais", async () => {
    const template = fs.readFileSync(TEMPLATE);
    const zipBuf = await buildDeclaracoesZip(template, [
      dest("ANA SILVA"),
      dest("ANA SILVA"),
    ]);
    const zip = await JSZip.loadAsync(zipBuf);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(["ANA SILVA-2.xlsx", "ANA SILVA.xlsx"]);
  });
});
