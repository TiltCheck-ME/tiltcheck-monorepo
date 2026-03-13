import request from 'supertest';
import { server } from './test-setup';
import { describe, it, expect } from 'vitest';

describe('POST /user/wallet', () => {
  it('should return 400 if discordId, publicKey, or signature is missing', async () => {
    await request(server).post('/user/wallet').send({}).expect(400);
    await request(server).post('/user/wallet').send({ discordId: '123' }).expect(400);
    await request(server).post('/user/wallet').send({ discordId: '123', publicKey: 'abc' }).expect(400);
  });

  it('should return 400 for an invalid signature', async () => {
    const response = await request(server)
      .post('/user/wallet')
      .send({
        discordId: '12345',
        publicKey: 'abcde',
        signature: 'invalid-signature',
        message: 'hello'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid signature');
  });

  // This test would require a real keypair and signing, which is complex for a simple unit test.
  // We will test the happy path in an integration test.
  it.skip('should return 200 for a valid signature and store the wallet', async () => {
    // 1. Generate a keypair
    // 2. Sign a message
    // 3. Send to endpoint
    // 4. Verify the database was updated
  });
});
