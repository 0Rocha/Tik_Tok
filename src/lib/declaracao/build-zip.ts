import JSZip from "jszip";
import type { DeclaracaoDestinatario } from "./fallback-map";
import { fillDeclaracaoTemplate, sanitizeFilename } from "./fill-template";

/** Nome de arquivo por destinatário; repetidos viram `Nome-2.xlsx`, `Nome-3.xlsx`. */
export function declaracaoFilenames(nomes: string[]): string[] {
  const used = new Map<string, number>();
  return nomes.map((nome) => {
    let name = sanitizeFilename(nome);
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count > 0) {
      const base = name.replace(/\.xlsx$/i, "");
      name = `${base}-${count + 1}.xlsx`;
    }
    return name;
  });
}

export async function buildDeclaracoesZip(
  templateBytes: Buffer | ArrayBuffer | Uint8Array,
  destinatarios: DeclaracaoDestinatario[],
): Promise<Buffer> {
  if (destinatarios.length === 0) {
    throw new Error("Nenhum destinatário para gerar.");
  }

  const zip = new JSZip();
  const names = declaracaoFilenames(destinatarios.map((d) => d.nome));

  for (let i = 0; i < destinatarios.length; i++) {
    const xlsx = await fillDeclaracaoTemplate(templateBytes, destinatarios[i]!);
    zip.file(names[i]!, Buffer.from(xlsx));
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
