import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function extractPdf(buffer) {
  let result;
  const pages = [];
  let renderError;
  try {
    result = await pdfParse(buffer, {
      max: 500,
      pagerender: async (pageData) => {
        try {
          const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
          let lastY;
          let text = "";
          for (const item of content.items) {
            text += lastY === item.transform[5] || !lastY ? item.str : `\n${item.str}`;
            lastY = item.transform[5];
          }
          const pageNumber = pageData.pageIndex + 1;
          pages.push({ page: pageNumber, text: normalizeText(text) });
          return `[Page ${pageNumber}]\n${text}`;
        } catch (error) {
          renderError = error;
          throw error;
        }
      }
    });
  } catch (cause) {
    const message = /encrypt|password/i.test(cause.message || "")
      ? "The PDF is password-protected and its text cannot be extracted."
      : "The PDF is corrupted or uses an unsupported document feature.";
    const error = new Error(message);
    error.status = 422;
    error.code = /encrypt|password/i.test(cause.message || "") ? "PDF_ENCRYPTED" : "PDF_PARSE_FAILED";
    error.cause = cause;
    throw error;
  }
  if (result.numpages > 500) {
    const error = new Error("This PDF has more than 500 pages and exceeds the supported document limit.");
    error.status = 413;
    error.code = "PDF_PAGE_LIMIT_EXCEEDED";
    throw error;
  }
  const text = normalizeText(result.text || "");
  if (!text) {
    if (renderError) {
      const error = new Error("The PDF text renderer could not read its page content.");
      error.status = 422;
      error.code = "PDF_RENDER_FAILED";
      error.cause = renderError;
      throw error;
    }
    const error = new Error("This PDF has no extractable text. It may be scanned; OCR is required before it can be indexed.");
    error.status = 422;
    error.code = "PDF_OCR_REQUIRED";
    throw error;
  }
  return { text, pageCount: result.numpages || null, pages };
}

function normalizeText(value) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
