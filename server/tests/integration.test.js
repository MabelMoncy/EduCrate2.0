import { jest } from '@jest/globals';

// Mock firebase before importing app
jest.unstable_mockModule('../lib/firebaseAdmin.js', () => ({
  initFirebaseAdmin: jest.fn(),
  isFirebaseAdminReady: jest.fn(() => true),
  admin: {
    auth: () => ({
      verifyIdToken: jest.fn(async () => ({
        uid: 'mocked-uid',
        email: 'test@example.com',
        email_verified: true,
      }))
    })
  }
}));

// Mock cloudinary
jest.unstable_mockModule('../config/cloudinary.js', () => ({
  default: {
    utils: {
      private_download_url: jest.fn(() => 'mock-url')
    },
    uploader: {
      upload_stream: jest.fn()
    }
  }
}));

jest.unstable_mockModule('../lib/cloudinaryUtils.js', () => ({
  uploadToCloudinary: jest.fn(async () => ({
    secure_url: 'mock-url',
    public_id: 'mock-public-id'
  }))
}));

// Mock pdf-parse
global.__mockPdfText = 'Some random text';
jest.unstable_mockModule('pdf-parse', () => ({
  default: jest.fn(async (buffer) => {
    return { text: global.__mockPdfText };
  })
}));

// We need to import the app dynamically AFTER mocking
const { default: app } = await import('../app.js');
const { default: request } = await import('supertest');
const { default: crypto } = await import('crypto');
const { default: path } = await import('path');
const { default: mongoose } = await import('mongoose');
const { MongoMemoryServer } = await import('mongodb-memory-server');
const { fileURLToPath } = await import('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Backend Integration & Security Tests', () => {

  describe('POST /api/orders/webhook (Razorpay)', () => {
    it('should validate Razorpay webhook signature and reject malicious payloads', async () => {
      const payload = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_test_123', amount: 50000, notes: { studentId: new mongoose.Types.ObjectId().toString(), pyqId: new mongoose.Types.ObjectId().toString() } } } }
      };
      const stringifiedPayload = JSON.stringify(payload);
      
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(stringifiedPayload)
        .digest('hex');

      const validResponse = await request(app)
        .post('/api/orders/webhook')
        .set('x-razorpay-signature', validSignature)
        .send(payload);

      expect(validResponse.status).not.toBe(400);

      const invalidResponse = await request(app)
        .post('/api/orders/webhook')
        .set('x-razorpay-signature', 'malicious_invalid_signature_string')
        .send(payload);

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.body).toHaveProperty('status', 'invalid signature');
    });
  });

  describe('POST /api/resources (File Upload)', () => {
    const mockToken = 'mock_token';
    
    it('should reject upload containing "Maths PYQ 2024"', async () => {
      global.__mockPdfText = 'Maths PYQ 2024';
      const filePath = path.join(__dirname, 'fixtures', 'dummy-0.pdf'); 
      
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('title', 'Maths Notes')
        .field('semester', 'S1')
        .field('subject', 'Mathematics for Information Science-1')
        .field('type', 'notes')
        .attach('file', filePath);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Question papers cannot be uploaded/i);
    });

    it('should reject upload containing "Previous year questions"', async () => {
      global.__mockPdfText = 'Previous year questions';
      const filePath = path.join(__dirname, 'fixtures', 'dummy-1.pdf'); 
      
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('title', 'Maths Notes')
        .field('semester', 'S1')
        .field('subject', 'Mathematics for Information Science-1')
        .field('type', 'notes')
        .attach('file', filePath);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Question papers cannot be uploaded/i);
    });

    it('should reject upload containing "Question paper 2025"', async () => {
      global.__mockPdfText = 'Question paper 2025';
      const filePath = path.join(__dirname, 'fixtures', 'dummy-2.pdf'); 
      
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('title', 'Maths Notes')
        .field('semester', 'S1')
        .field('subject', 'Mathematics for Information Science-1')
        .field('type', 'notes')
        .attach('file', filePath);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Question papers cannot be uploaded/i);
    });

    it('should accept or proceed with a valid PDF', async () => {
      global.__mockPdfText = 'Some random notes';
      const filePath = path.join(__dirname, 'fixtures', 'dummy-3.pdf'); 
      
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('title', 'Random Notes')
        .field('semester', 'S1')
        .field('subject', 'Mathematics for Information Science-1')
        .field('type', 'notes')
        .attach('file', filePath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'Random Notes');
    });
  });
});
