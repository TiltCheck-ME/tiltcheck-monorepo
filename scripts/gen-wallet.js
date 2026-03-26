import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const kp = Keypair.generate();
const walletInfo = `
---TILTCHECK_WALLET_GEN---
TIP_TREASURY_WALLET_PUB=${kp.publicKey.toBase58()}
TIP_TREASURY_WALLET_SECRET=${JSON.stringify(Array.from(kp.secretKey))}
---END---
`;

fs.writeFileSync('C:/Users/jmeni/tiltcheck-monorepo/scripts/wallet-result.txt', walletInfo);
console.log('Wallet generated and saved to wallet-result.txt');
