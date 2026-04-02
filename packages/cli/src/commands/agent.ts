import { Command } from 'commander';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import ora from 'ora';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from monorepo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../../.env') });

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'tiltcheck';
const LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const MODEL = 'gemini-1.5-pro-001'; // Common stable deployment tag 

const SYSTEM_INSTRUCTION = `You are the Lead Fullstack Architect and Head of Growth for *TiltCheck*, the 'Redeem-to-Win' platform. Your goal is to help build, debug, and optimize the Next.js, Web, Chrome Extension, and Node.js backend. 

**Core Technical Directives:**
1. Write strictly typed, production-ready TypeScript. Never use 'any'.
2. Keep the architecture modular within the pnpm monorepo structure (apps/, packages/, modules/).
3. Optimize for low-latency Core Web Vitals to improve Lighthouse scores.

**Marketing & Growth Directives:**
1. **Degen Brand Voice:** All UI copy suggestions must match the blunt, 'Audit Layer', surveillance-themed vibe (Teal/Obsidian/Gold palette). No emojis. No apologies.
2. **Conversion First:** Whenever reviewing frontend components, immediately suggest ways to tighten call-to-actions, reduce friction, or drive users toward cashing out (the core metric). 
3. **Monetization:** Always ensure architectural decisions support the 2.5% protocol fee infrastructure and Elite tier up-selling.`;

export const agentCommand = new Command('agent')
  .description('Consult the TiltCheck Fullstack & Marketing Vertex AI Orchestrator')
  .argument('<prompt>', 'Instruction or question for the agent')
  .option('-f, --file <path>', 'Include a specific file out of your workspace as context')
  .option('-d, --diff', 'Inject your current uncommitted Git changes as context', false)
  .action(async (prompt, options) => {
    let contextData = '';

    if (options.file) {
      if (existsSync(options.file)) {
        contextData = readFileSync(options.file, 'utf-8');
        console.log(`📎 Hooked context from file: ${options.file}`);
      } else {
        console.error(`❌ Error: File ${options.file} not found.`);
        process.exit(1);
      }
    } else if (options.diff) {
      try {
        contextData = execSync('git diff HEAD', { encoding: 'utf-8' });
        if (contextData.trim()) {
           console.log(`📎 Hooked current git diff context...`);
        } else {
           console.log(`ℹ️ No git diff changes found to attach.`);
        }
      } catch {
        console.warn('⚠️ Warning: Could not read git diff.');
      }
    }

    const finalPrompt = contextData 
      ? `${prompt}\n\nHere is the target code context for this request:\n\`\`\`\n${contextData}\n\`\`\``
      : prompt;

    console.log(`🚀 Uplinking to Vertex REST API [${PROJECT_ID}/${LOCATION}/${MODEL}] via API Key...`);
    const spinner = ora('Generating architecture & marketing analysis...').start();

    try {
      const apiKey = process.env.VERTEX_API_KEY;
      if (!apiKey) {
        throw new Error('VERTEX_API_KEY not found in .env file');
      }

      // Exact Vertex AI Endpoint mapped with the ?key= parameter
      const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
          systemInstruction: { role: 'system', parts: [{ text: SYSTEM_INSTRUCTION }] },
        })
      });

      spinner.stop();

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[HTTP ${response.status}] ${errorText}`);
      }

      const data = await response.json();
      process.stdout.write('\n');
      
      const candidateContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateContent) {
        process.stdout.write(candidateContent);
      } else {
        process.stdout.write('⚠️ Vertex AI returned an empty response.');
      }
      process.stdout.write('\n\n✅ Uplink Complete.\n');

    } catch (error) {
      spinner.stop();
      console.error('\n❌ Vertex AI Uplink Failed:', error instanceof Error ? error.message : String(error));
      console.error('Check your API Key routing and billing settings in Google Cloud.');
    }
  });
