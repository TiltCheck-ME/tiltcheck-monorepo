
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GROQ_API_KEY;

async function testModel(model) {
    console.log(`Testing model: ${model}`);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Say hi' }],
        }),
    });
    if (res.ok) {
        const data = await res.json();
        console.log(`✅ ${model} works: ${data.choices[0].message.content}`);
    } else {
        const err = await res.text();
        console.log(`❌ ${model} fails: ${err}`);
    }
}

await testModel('llama-3.1-8b-instant');
await testModel('llama-3.3-70b-versatile');
