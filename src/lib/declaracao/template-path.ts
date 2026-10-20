import path from "node:path";

export function getDeclaracaoTemplatePath(): string {
  return path.join(process.cwd(), "templates", "declaracao-conteudo.xlsx");
}
