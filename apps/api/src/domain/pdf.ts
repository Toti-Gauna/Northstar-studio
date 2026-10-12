import { money, type QuoteSnapshot } from "@northstar/contracts";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { hash } from "../auth";
import { env, projectRoot } from "../env";
const fontRoot = path.join(projectRoot, "assets/fonts");
export async function generatePdf(
  snapshot: QuoteSnapshot,
  versionId: string,
  number: number,
  sentAt: Date,
  beforeWrite?: (size: number) => Promise<void>,
) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: {
      Title: `${snapshot.brand.name} proposal ${snapshot.leadReference} v${number}`,
      Author: snapshot.brand.name,
      CreationDate: sentAt,
      ModDate: sentAt,
    },
    tagged: true,
    lang: snapshot.brand.locale === "es" ? "es-AR" : "en-US",
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const locale = snapshot.brand.locale;
  const es = locale === "es";
  const t = (en: string, esText: string) => (es ? esText : en);
  if (existsSync(path.join(fontRoot, "InstrumentSerif-Regular.ttf")))
    doc.registerFont(
      "Editorial",
      path.join(fontRoot, "InstrumentSerif-Regular.ttf"),
    );
  const serif = existsSync(path.join(fontRoot, "InstrumentSerif-Regular.ttf"))
    ? "Editorial"
    : "Times-Roman";
  doc.rect(0, 0, 595, 842).fill("#FFFCF7");
  doc.fillColor(snapshot.brand.navy);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(
      `${snapshot.brand.name.toUpperCase()} / ${snapshot.brand.tagline[locale]}`,
    );
  doc
    .moveDown(2)
    .font(serif)
    .fontSize(40)
    .text(
      t(
        "A clear scope.\nA confident next step.",
        "Un alcance claro.\nUn siguiente paso seguro.",
      ),
    );
  doc
    .moveDown(0.5)
    .font("Helvetica")
    .fontSize(11)
    .text(
      `${snapshot.leadReference} · ${t("Version", "Versión")} ${number} · ${snapshot.customerName}`,
    );
  doc.text(
    `${t("Issued", "Emitida")}: ${sentAt.toISOString().slice(0, 10)} · ${snapshot.currency}`,
  );
  doc
    .moveDown()
    .fontSize(9)
    .fillColor("#596575")
    .text(
      t(
        "Eclipse Demo · Fictional company and sample data. Acceptance is a recorded confirmation, not a certified electronic signature or payment.",
        "Eclipse Demo · Empresa y datos ficticios. La aceptación es una confirmación registrada, no una firma electrónica certificada ni un pago.",
      ),
    );
  const newPage = () => {
    doc.addPage();
    doc.rect(0, 0, 595, 842).fill("#FFFCF7");
    doc.y = 48;
    doc.fillColor(snapshot.brand.navy);
  };
  const ensure = (height: number) => {
    if (doc.y + height > 780) newPage();
  };
  for (const [i, option] of snapshot.options.entries()) {
    ensure(150);
    doc
      .moveDown(1.6)
      .font(serif)
      .fontSize(27)
      .fillColor(snapshot.brand.navy)
      .text(`${String(i + 1).padStart(2, "0")} / ${option.name}`);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `${option.days} ${t("indicative days", "días orientativos")} · ${option.revisions} ${t("revisions", "revisiones")}`,
      );
    doc.moveDown();
    for (const line of option.lines) {
      const label = `${line.label}   × ${line.quantity100 / 100}`;
      const h = doc.heightOfString(label, { width: 330 }) + 16;
      ensure(h);
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).text(label, 48, y, { width: 330 });
      doc.text(
        money(
          Math.floor((line.quantity100 * line.unitMinor + 50) / 100),
          snapshot.currency,
          locale,
        ),
        390,
        y,
        { width: 150, align: "right" },
      );
      doc.y = y + h;
      doc
        .moveTo(48, doc.y - 8)
        .lineTo(547, doc.y - 8)
        .strokeColor("#E2D8CA")
        .stroke();
    }
    ensure(110);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `${t("Subtotal", "Subtotal")}: ${money(option.totals.subtotalMinor, snapshot.currency, locale)}`,
      );
    doc.text(
      `${t("Discount", "Descuento")}: ${money(option.totals.discountMinor, snapshot.currency, locale)}`,
    );
    doc.text(
      `${t("Example tax", "Impuesto de ejemplo")}: ${money(option.totals.taxMinor, snapshot.currency, locale)}`,
    );
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(
        `${t("Total", "Total")}: ${money(option.totals.totalMinor, snapshot.currency, locale)}`,
      );
    const headings = {
      included: t("Included", "Incluido"),
      excluded: t("Excluded", "Excluido"),
      deliverables: t("Deliverables", "Entregables"),
      responsibilities: t(
        "Client responsibilities",
        "Responsabilidades del cliente",
      ),
      criteria: t("Acceptance criteria", "Criterios de aceptación"),
    };
    for (const [key, heading] of Object.entries(headings)) {
      ensure(70);
      doc.moveDown().font("Helvetica-Bold").fontSize(11).text(heading);
      for (const item of option.scope[key as keyof typeof option.scope]) {
        doc.font("Helvetica").fontSize(10);
        const height = doc.heightOfString(item, { width: 470 }) + 8;
        ensure(height);
        doc.text(`• ${item}`, { width: 470 });
        doc.moveDown(0.3);
      }
    }
  }
  ensure(100);
  doc
    .moveDown()
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(t("Terms", "Condiciones"));
  doc.font("Helvetica").fontSize(10).text(snapshot.terms);
  doc
    .moveDown()
    .fontSize(8)
    .text(
      `${t("Reference", "Referencia")}: ${versionId} · ${snapshot.brand.contact}`,
    );
  doc.end();
  const buffer = await done;
  const dir = path.resolve(env.STORAGE_DIR, "pdf");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const location = path.join(dir, `${versionId}.pdf`);
  await beforeWrite?.(buffer.length);
  await writeFile(location, buffer, { mode: 0o600 });
  return { path: location, hash: hash(buffer), size: buffer.length };
}
