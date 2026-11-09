import './testEnv.js';
import supertest from 'supertest';
import app from '../../server/server.js';

/**
 * Shared supertest agent connected to the EduCrate Express app.
 * Does not require binding to a local TCP port.
 */
export const request = supertest(app);
export { app };
