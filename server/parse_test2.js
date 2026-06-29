import fs from 'fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function run() {
  console.log('pdfParse type:', typeof pdfParse);
  if (typeof pdfParse === 'function') {
    const data = await pdfParse(fs.readFileSync('tests/fixtures/dummy-0.pdf'));
    console.log('Parsed text:', data.text);
  } else if (pdfParse.default) {
    const data = await pdfParse.default(fs.readFileSync('tests/fixtures/dummy-0.pdf'));
    console.log('Parsed text:', data.text);
  } else {
    console.log(pdfParse);
  }
}
run();
