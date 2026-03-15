#!/usr/bin/env node
// gmail-ingest.mjs
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

// --- CONFIGURATION ---
const API_BASE_URL = 'http://localhost:3001';
const CREDENTIALS_PATH = path.resolve(process.cwd(), 'apps/api/credentials.json');
const TOKEN_PATH = path.resolve(process.cwd(), 'apps/api/token.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Load API key from .env file
const envPath = path.resolve(process.cwd(), '.env');
let INGEST_API_KEY;
try {
  const envFile = await fs.readFile(envPath, { encoding: 'utf8' });
  const match = envFile.match(/^COMMUNITY_INTEL_INGEST_KEY=(.*)$/m);
  if (match && match[1]) {
    INGEST_API_KEY = match[1].trim();
  }
} catch {
  // .env file might not exist
}

if (!INGEST_API_KEY) {
  if (process.env.NODE_ENV !== 'production') {
    INGEST_API_KEY = 'dev-ingest-key'; // Development override
    console.warn('\x1b[33m%s\x1b[0m', '[WARN] Using development ingest key for agent. Set COMMUNITY_INTEL_INGEST_KEY in .env for production.');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '[ERROR] COMMUNITY_INTEL_INGEST_KEY not found in .env file. Please add it.');
    process.exit(1);
  }
}

// --- HELPER FUNCTIONS ---
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// --- MAIN LOGIC ---

async function main() {
  console.log('[INFO] Starting Gmail Ingestion Agent...');

  // 1. Authenticate with Google
  console.log('[INFO] Authenticating with Google...');
  let auth;
  try {
    auth = await authorize();
    console.log('[SUCCESS] Google authentication successful.');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '[ERROR] Google authentication failed. Please ensure credentials.json is correct and you have granted permission.');
    console.error(error.message);
    process.exit(1);
  }

  const gmail = google.gmail({ version: 'v1', auth });

  // 2. Fetch the list of known casinos
  console.log('[INFO] Fetching known casino list from local API...');
  let casinoDomains = [];
  try {
    const response = await fetch(`${API_BASE_URL}/bonus/casinos`);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const data = await response.json();
    console.log('[DEBUG] Raw casino list data:', data); // Debugging log
    casinoDomains = data.casinos.map(c => c.host).filter(Boolean);
    if (casinoDomains.length === 0) throw new Error('Casino list is empty.');
    console.log(`[INFO] Found ${casinoDomains.length} casino domains to search for.`);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '[ERROR] Failed to fetch casino list. Is the local API server running?');
    console.error(error.message);
    process.exit(1);
  }

  // 3. Build Gmail query and search
  const fromQuery = casinoDomains.map(d => `from:${d}`).join(' OR ');
  const subjectQuery = 'subject:("free spins" OR "bonus" OR "promotion" OR "deposit match" OR "receipt")';
  const gmailQuery = `((${fromQuery}) OR (${subjectQuery})) newer_than:7d`;

  console.log(`[INFO] Searching Gmail with query: ${gmailQuery}`);
  const messagesResponse = await gmail.users.messages.list({
    userId: 'me',
    q: gmailQuery,
    maxResults: 25,
  });

  const messages = messagesResponse.data.messages;
  if (!messages || messages.length === 0) {
    console.log('[INFO] No new promotional emails found. Exiting.');
    return;
  }

  console.log(`[INFO] Found ${messages.length} potential emails. Processing...`);

  // 4. Process each email
  for (const messageHeader of messages) {
    if (!messageHeader.id) continue;
    const messageId = messageHeader.id;
    
    try {
      const emailRes = await gmail.users.messages.get({ userId: 'me', id: messageId });
      const email = emailRes.data;

      const subject = email.payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = email.payload.headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
      
      let decodedBody = '';
      const part = email.payload.parts?.find(p => p.mimeType === 'text/plain');
      if (part?.body?.data) {
        decodedBody = Buffer.from(part.body.data, 'base64').toString('utf8');
      }

      if (!decodedBody) {
        console.warn(`[WARN] Could not find plain text body for email ID: ${messageId}. Skipping.`);
        continue;
      }

      console.log(`[INFO]   > Processing email from: ${from} | Subject: ${subject}`);
      console.log('[AGENT] Debugging Ingest Key. Sending (first 5 chars):', INGEST_API_KEY ? `"${INGEST_API_KEY.substring(0, 5)}..."` : 'Not Set');

      // 5. Ingest data into the Trust Engine
      const ingestPayload = {
        source: 'gmail-agent-nodejs',
        report: `From: ${from}
Subject: ${subject}

${decodedBody}`,
        source_metadata: { gmail_message_id: messageId },
      };

      const ingestResponse = await fetch(`${API_BASE_URL}/rgaas/trust/degen-intel`, {
        method: 'POST',
        body: JSON.stringify(ingestPayload),
        headers: {
          'Content-Type': 'application/json',
          'x-community-intel-key': INGEST_API_KEY,
        },
      });

      if (!ingestResponse.ok) throw new Error(`Ingest API returned status ${ingestResponse.status}`);
      
      console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] Ingested data for email ID: ${messageId}`);

    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `[ERROR] Failed to process or ingest email ID: ${messageId}.`);
      console.error(error.message);
    }
  }

  console.log('[INFO] Gmail Ingestion Agent finished.');
}

main().catch(console.error);
