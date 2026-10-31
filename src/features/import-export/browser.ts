import { resolveCoverSource } from "@/features/attachments/cover";
import { isRichDocument, type DocumentNode } from "@/lib/tiptap/document";
import type { Note } from "@/types/note";

export function downloadFile(data: BlobPart, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function safeName(value: string): string { return value.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 100) || "tackly"; }
/** Raster pages preserve Unicode through the browser's font shaper; no truncated text or invalid PDF byte offsets. */
export async function notesPdf(notes: readonly Note[], name: string): Promise<Uint8Array<ArrayBuffer>> {
  const pages: Uint8Array[] = []; const canvas = document.createElement("canvas"); canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext("2d"); if (!ctx) throw Error("PDF rendering is unavailable in this browser.");
  const colors = getComputedStyle(document.documentElement); const background = colors.getPropertyValue("--surface").trim(); const ink = colors.getPropertyValue("--foreground").trim();
  let y = 0;
  const begin = () => { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = ink; ctx.font = "24px sans-serif"; y = 90; };
  const end = () => { const raw = atob(canvas.toDataURL("image/jpeg", .94).split(",")[1]!); pages.push(Uint8Array.from(raw, (char) => char.charCodeAt(0))); };
  const line = (text: string) => { if (y > 1640) { end(); begin(); } ctx.fillText(text, 70, y); y += 34; };
  const paragraph = (text: string) => { for (const row of text.split(/\r?\n/)) { let part = ""; for (const char of row) { if (ctx.measureText(part + char).width > 1090) { line(part); part = ""; } part += char; } line(part); } };
  begin(); paragraph(name); line("");
  for (const note of notes) {
    paragraph(note.title || "Untitled"); paragraph(note.excerpt);
    for (const task of note.subtasks) paragraph(`${task.completed ? "[x]" : "[ ]"} ${task.title}`);
    const urls = isRichDocument(note.content) ? documentImages(note.content.content) : [];
    if (note.appearance.coverUrl) { const cover = await resolveCoverSource(note.appearance.coverUrl); if (!cover) throw Error("A cover image could not be read for PDF export. Retry while online."); urls.unshift(cover); }
    for (const url of urls) { const image = new Image(); image.crossOrigin = "anonymous"; image.src = url; try { await image.decode(); } catch { throw Error("An image could not be included in the PDF. Retry while online."); }
      const scale = Math.min(1, 1090 / Math.max(1, image.naturalWidth), 600 / Math.max(1, image.naturalHeight)); const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      if (y + height > 1640) { end(); begin(); } ctx.drawImage(image, 70, y, width, height); y += height + 34;
    }
    line("");
  }
  end(); return pdfFromJpegs(pages, canvas.width, canvas.height);
}
export function pdfFromJpegs(pages: readonly Uint8Array[], width: number, height: number): Uint8Array<ArrayBuffer> {
  const encode = (value: string) => new TextEncoder().encode(value); const chunks: Uint8Array[] = []; const offsets: number[] = [0]; let length = 0;
  const append = (data: Uint8Array | string) => { const bytes = typeof data === "string" ? encode(data) : data; chunks.push(bytes); length += bytes.length; };
  const object = (id: number, body: string | Uint8Array[]) => { offsets[id] = length; append(`${id} 0 obj\n`); if (typeof body === "string") append(body); else body.forEach(append); append("\nendobj\n"); };
  append("%PDF-1.4\n"); object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`);
  pages.forEach((jpeg, i) => { const id = 3 + i * 3; const command = "q 595 0 0 842 0 0 cm /Im0 Do Q";
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    object(id + 1, [encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, encode("\nendstream")]);
    object(id + 2, `<< /Length ${command.length} >>\nstream\n${command}\nendstream`);
  });
  const xref = length; append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`); for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const output = new Uint8Array(length); let cursor = 0; for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.length; } return output;
}
/** Capture the actual visible board, not an invented grid. Inline computed styles and image bytes before rasterizing. */
export async function boardPng(): Promise<Blob> {
  const root = document.querySelector<HTMLElement>("[data-export-surface]"); if (!root) throw Error("Open Board, Grid, List, or Canvas before exporting its image.");
  const { width, height } = root.getBoundingClientRect(); if (!width || !height || width * height > 16000000) throw Error("Board image is too large. Reduce the browser window size and retry.");
  const inlineClone = async (source: HTMLElement): Promise<HTMLElement> => {
    const clone = source.cloneNode(true) as HTMLElement; const originals = [source, ...source.querySelectorAll<HTMLElement>("*")]; const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
    for (let i = 0; i < originals.length; i++) {
      const original = originals[i]!; const copy = copies[i]!; const style = getComputedStyle(original);
      copy.style.cssText = Array.from(style).map((key) => `${key}:${style.getPropertyValue(key)}`).join(";"); copy.removeAttribute("contenteditable");
      if (original instanceof HTMLTextAreaElement) copy.textContent = original.value;
      if (original instanceof HTMLInputElement) { copy.setAttribute("value", original.value); if (original.checked) copy.setAttribute("checked", ""); else copy.removeAttribute("checked"); }
      if (copy instanceof HTMLImageElement) { const response = await fetch(original.getAttribute("src") ?? ""); if (!response.ok) throw Error("An image could not be included. Retry while online."); copy.src = await blobDataUrl(await response.blob()); }
      const backgrounds = [...style.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
      for (const match of backgrounds) { const response = await fetch(match[1]!); if (!response.ok) throw Error("The background image could not be included. Retry while online."); copy.style.backgroundImage = copy.style.backgroundImage.replace(match[0], `url("${await blobDataUrl(await response.blob())}")`); }
    }
    for (let i = 0; i < originals.length; i++) {
      const original = originals[i]!, copy = copies[i]!;
      if (!(original instanceof HTMLInputElement) && !(original instanceof HTMLTextAreaElement) && (original.scrollTop || original.scrollLeft)) {
        const inner = document.createElement("div"); inner.style.display = getComputedStyle(original).display; inner.style.flexDirection = getComputedStyle(original).flexDirection; inner.style.position = "relative"; inner.style.width = `${original.scrollWidth}px`; inner.style.height = `${original.scrollHeight}px`; inner.style.left = `${-original.scrollLeft}px`; inner.style.top = `${-original.scrollTop}px`;
        while (copy.firstChild) inner.appendChild(copy.firstChild); copy.appendChild(inner); copy.style.overflow = "hidden";
      }
    }
    return clone;
  };
  const clone = await inlineClone(root); clone.style.width = `${width}px`; clone.style.height = `${height}px`; clone.style.margin = "0"; clone.style.position = "relative";
  const wrapper = document.createElement("div"); wrapper.style.cssText = `position:relative;overflow:hidden;width:${width}px;height:${height}px;background-color:${getComputedStyle(document.documentElement).getPropertyValue("--background")}`;
  const scenic = document.querySelector<HTMLElement>('[data-testid="app-background"]');
  if (scenic) { const backdrop = await inlineClone(scenic); const rect = root.getBoundingClientRect(); backdrop.style.position = "absolute"; backdrop.style.width = `${window.innerWidth}px`; backdrop.style.height = `${window.innerHeight}px`; backdrop.style.left = `${-rect.left}px`; backdrop.style.top = `${-rect.top}px`; wrapper.appendChild(backdrop); }
  wrapper.appendChild(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(wrapper)}</foreignObject></svg>`;
  const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await image.decode();
  const canvas = document.createElement("canvas"); canvas.width = Math.ceil(width); canvas.height = Math.ceil(height); const ctx = canvas.getContext("2d"); if (!ctx) throw Error("Image export is unavailable."); ctx.drawImage(image, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(Error("Image rendering failed.")), "image/png"));
}
export function blobDataUrl(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(Error("File reading failed.")); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(Error("File reading failed.")); reader.readAsDataURL(blob); }); }

function documentImages(nodes: readonly DocumentNode[]): string[] { return nodes.flatMap((node) => node.type === "image" && typeof node.attrs?.src === "string" ? [node.attrs.src] : documentImages(node.content ?? [])); }
