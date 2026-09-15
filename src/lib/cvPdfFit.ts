/**
 * Fit-to-page for CV PDFs ("shrink one page"): a CV must never end on a nearly empty
 * last page. Shared by /api/cv/pdf and the QA length sweep so both run the same selection.
 */

export const FIT_DENSITIES = [0.95, 0.9, 0.86] as const
// Last page counts as stranded below this share of the other pages' average text.
export const SHORT_LAST_PAGE_RATIO = 0.35

export async function pageTexts(pdf: Uint8Array): Promise<string[]> {
  // In a bundled route pdf.js cannot import its worker file by relative path; loading the
  // worker module first registers its handler on globalThis so the in-process worker uses it.
  // @ts-expect-error -- pdfjs-dist ships no type declarations for its worker entry.
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  const { PDFParse } = await import('pdf-parse')
  // pdf.js may transfer (detach) the buffer it is given; the caller still needs the bytes.
  const parser = new PDFParse({ data: new Uint8Array(pdf) })
  try {
    const result = await parser.getText()
    return result.pages.map(p => p.text.replace(/\s+/g, ' ').trim())
  } finally {
    await parser.destroy()
  }
}

export function hasShortLastPage(pages: string[]): boolean {
  if (pages.length < 2) return false
  const others = pages.slice(0, -1)
  const avg = others.reduce((n, p) => n + p.length, 0) / others.length
  return pages[pages.length - 1].length < avg * SHORT_LAST_PAGE_RATIO
}

export interface FitResult { pdf: Uint8Array; density: number; pages: number }

/**
 * Renders at density 1 and, only when the last page is short, retries denser layouts,
 * keeping the first that drops a page. Render errors propagate (the caller owns the
 * font fallback); a text-extraction failure just keeps the density-1 render.
 */
export async function renderFitted(render: (density: number) => Promise<Uint8Array>): Promise<FitResult> {
  const base = await render(1)
  let pages: string[]
  try {
    pages = await pageTexts(base)
  } catch (err) {
    console.error('[cv/pdf] page text extraction failed, skipping fit-to-page:', err)
    return { pdf: base, density: 1, pages: 0 }
  }
  if (!hasShortLastPage(pages)) return { pdf: base, density: 1, pages: pages.length }

  for (const density of FIT_DENSITIES) {
    const candidate = await render(density)
    let count: number
    try {
      count = (await pageTexts(candidate)).length
    } catch (err) {
      console.error('[cv/pdf] page text extraction failed, skipping fit-to-page:', err)
      break
    }
    if (count < pages.length) return { pdf: candidate, density, pages: count }
  }
  return { pdf: base, density: 1, pages: pages.length }
}
