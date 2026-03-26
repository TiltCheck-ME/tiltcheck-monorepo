
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs';
import dotenv from 'dotenv';

const client = new SecretManagerServiceClient();
const PROJECT_ID = 'tiltchcek';

async function checkSecrets() {
  console.log('🛡️ [SecretWatcher] Analyzing secret integrity...');
  
  if (!fs.existsSync('.env')) {
    console.error('❌ No local .env found to compare.');
    return;
  }

  const localEnv = dotenv.parse(fs.readFileSync('.env'));
  const cloudRunServices = ['tiltcheck-api', 'tiltcheck-bot'];

  for (const [key, value] of Object.entries(localEnv)) {
    try {
      const [version] = await client.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/${key}/versions/latest`,
      });

      const payload = version.payload?.data?.toString();
      if (payload !== value) {
        console.warn(`⚠️ [MISMATCH] Secret "${key}" differs between local .env and GCP Secret Manager.`);
        console.log(`   Action: Run 'uvx agent-starter-pack upload-secrets' or update GCP Console.`);
      }
    } catch (err) {
      // Secret might not exist in GCP
    }
  }
  console.log('✅ [SecretWatcher] Check complete.');
}

checkSecrets();
