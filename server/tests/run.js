import app from '../app.js';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const filePath = path.join(__dirname, '..', 'scripts', 'fixtures', 'dummy-0.pdf');
  try {
      const response = await request(app)
        .post('/api/resources')
        .field('title', 'Maths Notes')
        .field('semester', 'S1')
        .field('subject', 'Mathematics for Information Science-1')
        .field('type', 'notes')
        .attach('file', filePath);
      console.log('Status:', response.status);
      console.log('Body:', response.body);
  } catch (e) {
      console.error(e);
  }
}
run();
