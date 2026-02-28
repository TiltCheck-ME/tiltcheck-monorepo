import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';

async function run() {
    const kp = Keypair.generate();
    const pubKey = kp.publicKey.toBase58();
    const privKey = bs58.encode(kp.secretKey);

    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('.env file not found at', envPath);
        process.exit(1);
    }

    let content = fs.readFileSync(envPath, 'utf8');

    // Replace the empty var with the new key
    if (content.includes('JUSTTHETIP_BOT_WALLET_PRIVATE_KEY=')) {
        content = content.replace(/JUSTTHETIP_BOT_WALLET_PRIVATE_KEY=.*/, `JUSTTHETIP_BOT_WALLET_PRIVATE_KEY=${privKey}`);
    } else {
        content += `\nJUSTTHETIP_BOT_WALLET_PRIVATE_KEY=${privKey}`;
    }

    fs.writeFileSync(envPath, content);

    console.log('--- NEW WALLET GENERATED ---');
    console.log('Public Key:', pubKey);
    console.log('Private Key has been saved to your local .env file.');
    console.log('-----------------------------');
}

run();
