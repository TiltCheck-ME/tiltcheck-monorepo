
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFallbackProviders, getRequestedProvider } from './provider-switcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PROVIDER = getRequestedProvider('groq');
const PROVIDERS = {
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY || '',
        label: 'Groq',
    },
    huggingface: {
        baseUrl: 'https://router.huggingface.co/v1',
        apiKey: process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN || '',
        label: 'Hugging Face',
    },
};
const PROVIDER_SWITCH = getFallbackProviders(PROVIDER, PROVIDERS);
const currentProvider = PROVIDER_SWITCH.providers.find((provider) => Boolean(provider.apiKey));

if (!currentProvider) {
    throw new Error(`Provider switcher blocked every configured test-models provider. Requested=${PROVIDER}.`);
}

async function testModel(model) {
    console.log(`Testing model: ${model} via ${currentProvider.label}`);
    const res = await fetch(`${currentProvider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentProvider.apiKey}`,
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
