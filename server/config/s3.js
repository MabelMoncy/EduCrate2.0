import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com';
const region = process.env.B2_REGION || 'eu-central-003';
const accessKeyId = process.env.B2_KEY_ID || (process.env.NODE_ENV === 'test' ? 'mock-b2-key-id' : undefined);
const secretAccessKey = process.env.B2_APPLICATION_KEY || (process.env.NODE_ENV === 'test' ? 'mock-b2-application-key' : undefined);

export const s3 = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: accessKeyId && secretAccessKey ? {
    accessKeyId,
    secretAccessKey,
  } : undefined,
});

export const B2_BUCKET = process.env.B2_BUCKET_NAME || 'educrate-storage-dev';

export default s3;
