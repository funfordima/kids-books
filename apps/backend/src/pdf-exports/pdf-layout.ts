import type {
  PdfExportBookSnapshot,
  PdfLoadedImage
} from "./pdf-export.interfaces";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toDataUri = (image: PdfLoadedImage): string =>
  `data:${image.mimeType};base64,${image.bytes.toString("base64")}`;

export function buildPdfHtml(
  snapshot: PdfExportBookSnapshot,
  imagesByPageId: ReadonlyMap<string, PdfLoadedImage>
): string {
  const title = escapeHtml(snapshot.title);
  const pages = snapshot.pages
    .map((page) => {
      const image = imagesByPageId.get(page.pageId);
      const figure = image
        ? `<img src="${toDataUri(image)}" alt="${escapeHtml(image.altText)}" />`
        : `<div class="placeholder" role="img" aria-label="${escapeHtml(
            page.illustrationDescription
          )}">Illustration pending</div>`;

      return `<section class="page" aria-label="Page ${page.pageNumber}">
  <figure>${figure}<figcaption>${escapeHtml(page.illustrationDescription)}</figcaption></figure>
  <p>${escapeHtml(page.textContent)}</p>
  <footer>${page.pageNumber}</footer>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0.5in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f2933; background: #ffffff; font-family: Arial, sans-serif; }
    .cover, .page { break-after: page; min-height: 10in; display: flex; flex-direction: column; justify-content: space-between; }
    .cover { align-items: center; justify-content: center; text-align: center; border: 2px solid #2f6f73; padding: 0.6in; }
    h1 { font-size: 34px; line-height: 1.2; margin: 0 0 16px; }
    .page figure { margin: 0 0 18px; min-height: 5.8in; display: flex; flex-direction: column; justify-content: center; }
    img { max-width: 100%; max-height: 5.6in; object-fit: contain; }
    figcaption { font-size: 12px; color: #52606d; margin-top: 8px; }
    p { font-size: 19px; line-height: 1.5; margin: 0; }
    footer { text-align: center; color: #52606d; font-size: 12px; margin-top: 20px; }
    .placeholder { min-height: 5.2in; border: 2px dashed #9fb3b8; color: #486581; display: flex; align-items: center; justify-content: center; background: #f5fbfb; }
  </style>
</head>
<body>
<section class="cover" aria-label="Cover">
  <h1>${title}</h1>
  <p>A personalized children's book</p>
</section>
${pages}
</body>
</html>`;
}

export function sanitizePdfFilename(title: string): string {
  const cleaned = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);

  return `${cleaned || "book"}.pdf`;
}
