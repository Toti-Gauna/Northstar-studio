import { PDFArray, PDFDict, PDFDocument, PDFName, PDFStream } from "pdf-lib";
import { PNG } from "pngjs";
import { fail } from "./errors";
// Parsed objects catch encoded names and compressed object streams that byte sniffing misses.
export async function validateDocument(buffer: Buffer, mime: string) {
  if (mime === "image/png") {
    try {
      const image = PNG.sync.read(buffer, { checkCRC: true });
      if (
        !image.width ||
        !image.height ||
        image.width * image.height > 16000000
      )
        fail(
          422,
          "INVALID_FILE",
          "PNG must contain at most 16 million pixels.",
        );
    } catch {
      fail(422, "INVALID_FILE", "PNG structure or checksum is invalid.");
    }
  }
  if (mime === "application/pdf") {
    try {
      const doc = await PDFDocument.load(buffer, {
        ignoreEncryption: false,
        throwOnInvalidObject: true,
      });
      if (!doc.getPageCount() || doc.getPageCount() > 100)
        fail(422, "INVALID_FILE", "Use a passive PDF with 1–100 pages.");
      const banned = new Set([
        "JS",
        "JavaScript",
        "Launch",
        "OpenAction",
        "AA",
        "EmbeddedFiles",
        "EmbeddedFile",
        "RichMedia",
        "XFA",
      ]);
      const visited = new Set<unknown>();
      const inspect = (object: unknown) => {
        if (visited.has(object)) return;
        visited.add(object);
        if (object instanceof PDFName && banned.has(object.decodeText()))
          fail(422, "INVALID_FILE", "PDF contains active or embedded content.");
        if (object instanceof PDFStream) inspect(object.dict);
        if (object instanceof PDFDict)
          for (const [key, value] of object.entries()) {
            inspect(key);
            inspect(value);
          }
        if (object instanceof PDFArray)
          for (const value of object.asArray()) inspect(value);
      };
      for (const [, object] of doc.context.enumerateIndirectObjects())
        inspect(object);
    } catch {
      fail(
        422,
        "INVALID_FILE",
        "Use a valid, unencrypted passive PDF without embedded content.",
      );
    }
  }
}
