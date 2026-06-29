const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const variations = [
  'PYQ 2024',
  'Previous year questions',
  'Question paper 2025',
  'Some random notes', // This one should pass
];

const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures');

async function createDummyPdf(text, filename) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 30;

  page.drawText(text, {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    font: timesRomanFont,
    color: rgb(0, 0.53, 0.71),
  });

  const pdfBytes = await pdfDoc.save();

  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  fs.writeFileSync(path.join(fixturesDir, filename), pdfBytes);
  console.log(`Created dummy PDF: ${filename}`);
}

async function run() {
  for (let i = 0; i < variations.length; i++) {
    const filename = `dummy-${i}.pdf`;
    await createDummyPdf(variations[i], filename);
  }
}

run();
