import { DatabaseClient } from '../src/index';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export const db = new DatabaseClient({
  url: process.env.SUPABASE_URL,
  apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
