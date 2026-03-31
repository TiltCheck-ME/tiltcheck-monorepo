import fs from 'fs';
import { generateTrustScore } from './engine.js';

const filePath = process.argv[2];

if (!filePath) {
    console.error("Usage: node cli.js <path-to-json-file>");
    process.exit(1);
}

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const records = JSON.parse(data);

    // If it's an array of mock records
    if (Array.isArray(records)) {
        console.log("=========================================");
        console.log(" TILTCHECK DISCORD TRUST SCORER (V1 LITE)");
        console.log("=========================================\n");

        records.forEach(record => {
            const result = generateTrustScore(record.user, record.guilds || []);
            console.log(`TYPE: ${record.type.toUpperCase()}`);
            console.log(`USER: ${record.user.username}`);
            console.log(`SCORE: ${result.trustScore}/100 [Risk: ${result.riskLevel}]`);
            console.log("REASONS:");
            result.reasons.forEach(r => console.log(`  - ${r}`));
            console.log("-----------------------------------------");
        });
    } else {
        // Single user parsing
        const result = generateTrustScore(records.user || records, records.guilds || []);
        console.log(JSON.stringify(result, null, 2));
    }

} catch (err) {
    console.error(`Error processing file: ${err.message}`);
}
