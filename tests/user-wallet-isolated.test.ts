import request from 'supertest';
import { app } from './apps/api/src/app';
import { describe, it, expect } from 'vitest';

describe('POST /user/wallet', () => {
  it('should return 400 if discordId, publicKey, or signature is missing', async () => {
    await request(app).post('/user/wallet').send({}).expect(400);
    await request(app).post('/user/wallet').send({ discordId: '123' }).expect(400);
    await request(app).post('/user/wallet').send({ discordId: '123', publicKey: 'abc' }).expect(400);
  });

  it('should return 400 for an invalid signature', async () => {
    const response = await request(app)
      .post('/user/wallet')
      .send({
        discordId: '12345',
        publicKey: 'YTM0YjY4Y2QxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTA=',
        signature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        message: 'hello'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid signature');
  });
});
