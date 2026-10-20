import JSZip from "jszip";
import type { DeclaracaoDestinatario } from "./fallback-map";
import { fillDeclaracaoTemplate, sanitizeFilename } from "./fill-template";

export async function buildDeclaracoesZip(
  templateBytes: Buffer | ArrayBuffer | Uint8Array,
  destinatarios: DeclaracaoDestinatario[],
): Promise<Buffer> {
  if (destinatarios.length === 0) {
    throw new Error("Nenhum destinatário para gerar.");
  }

  const zip = new JSZip();
  const used = new Map<string, number>();

  for (const dest of destinatarios) {
    let name = sanitizeFilename(dest.nome);
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count > 0) {
      const base = name.replace(/\.xlsx$/i, "");
      name = `${base}-${count + 1}.xlsx`;
    }

    const xlsx = await fillDeclaracaoTemplate(templateBytes, dest);
    zip.file(name, Buffer.from(xlsx));
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
