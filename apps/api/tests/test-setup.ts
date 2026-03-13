import { beforeAll, afterAll } from 'vitest';
import { app } from '../src/index';
import http from 'http';

let server: http.Server;

beforeAll(() => {
  server = http.createServer(app);
  server.listen(0); // Listen on a random port
});

afterAll(() => {
  server.close();
});

export { server };
