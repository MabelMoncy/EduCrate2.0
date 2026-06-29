const pdf = require('pdf-parse');
const fs = require('fs');

async function run() {
  const data = await pdf(fs.readFileSync('tests/fixtures/dummy-0.pdf'));
  console.log('Parsed text:', data.text);
}
run();
