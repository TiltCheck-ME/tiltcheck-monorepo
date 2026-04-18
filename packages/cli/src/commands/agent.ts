/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
import { Command } from 'commander';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import ora from 'ora';
import * as dotenv from 'dotenv';
import { createInterface } from 'readline/promises';
import { fileURLToPath } from 'url';
import { dirname, join, relative, resolve, isAbsolute } from 'path';

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

const SENSITIVE_PATTERNS = [
  {
    pattern: /-----BEGIN[\s\S]+?PRIVATE KEY-----[\s\S]+?-----END[\s\S]+?PRIVATE KEY-----/g,
    replacement: '[REDACTED PRIVATE KEY BLOCK]',
  },
  {
    pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: 'Bearer [REDACTED]',
  },
  {
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g,
    replacement: '[REDACTED JWT]',
  },
];

const SENSITIVE_LINE_PATTERN =
  /\b(password|passphrase|secret|token|api[_-]?key|client[_-]?secret|authorization|cookie|session|private[_-]?key)\b/i;

type ContextPreparationResult = {
  content: string;
  sourceLabel: string;
  redactionCount: number;
};

function ensureWorkspaceFile(filePath: string): string {
  const workspaceRoot = process.cwd();
  const resolvedPath = resolve(filePath);
  const relativePath = relative(workspaceRoot, resolvedPath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Refusing to upload files outside the current workspace: ${filePath}`);
  }

  return resolvedPath;
}

function redactSensitiveContent(content: string): { content: string; redactionCount: number } {
  let sanitized = content;
  let redactionCount = 0;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, () => {
      redactionCount += 1;
      return replacement;
    });
  }

  sanitized = sanitized
    .split(/\r?\n/)
    .map((line) => {
      if (!SENSITIVE_LINE_PATTERN.test(line) || !/[:=]/.test(line)) {
        return line;
      }

      redactionCount += 1;
      return line.replace(/([:=]\s*).*/, '$1[REDACTED]');
    })
    .join('\n');

  return { content: sanitized, redactionCount };
}

async function confirmUpload(summary: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Context upload confirmation requires a TTY. Re-run with --yes after reviewing the upload.');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = await rl.question(`${summary}\nType "upload" to continue: `);
    return answer.trim().toLowerCase() === 'upload';
  } finally {
    rl.close();
  }
}

async function prepareContext(
  options: { file?: string; diff?: boolean; allowUnredacted?: boolean; yes?: boolean },
): Promise<ContextPreparationResult | null> {
  let rawContent = '';
  let sourceLabel = '';

  if (options.file) {
    const filePath = ensureWorkspaceFile(options.file);
    if (!existsSync(filePath)) {
      throw new Error(`File ${options.file} not found.`);
    }

    rawContent = readFileSync(filePath, 'utf-8');
    sourceLabel = `file ${relative(process.cwd(), filePath)}`;
  } else if (options.diff) {
    rawContent = execSync('git --no-pager diff HEAD', { encoding: 'utf-8' });
    if (!rawContent.trim()) {
      return null;
    }

    sourceLabel = 'current git diff';
  }

  if (!rawContent) {
    return null;
  }

  const prepared = options.allowUnredacted
    ? { content: rawContent, redactionCount: 0 }
    : redactSensitiveContent(rawContent);

  const size = Buffer.byteLength(prepared.content, 'utf-8');
  const redactionSummary = options.allowUnredacted
    ? 'Automatic redaction disabled.'
    : `Automatic redaction applied to ${prepared.redactionCount} match${prepared.redactionCount === 1 ? '' : 'es'}.`;

  if (!options.yes) {
    const confirmed = await confirmUpload(
      `About to upload ${sourceLabel} to Vertex (${size} bytes). ${redactionSummary}`,
    );
    if (!confirmed) {
      throw new Error('Upload aborted by user.');
    }
  }

  return {
    content: prepared.content,
    sourceLabel,
    redactionCount: prepared.redactionCount,
  };
}

export const agentCommand = new Command('agent')
  .description('Consult the TiltCheck Fullstack & Marketing Vertex AI Orchestrator')
  .argument('<prompt>', 'Instruction or question for the agent')
  .option('-f, --file <path>', 'Include a specific file out of your workspace as context')
  .option('-d, --diff', 'Inject your current uncommitted Git changes as context', false)
  .option('--allow-unredacted', 'Upload attached context without automatic redaction', false)
  .option('-y, --yes', 'Skip the context upload confirmation prompt', false)
  .action(async (prompt, options) => {
    let preparedContext: ContextPreparationResult | null = null;

    try {
      preparedContext = await prepareContext(options);
      if (preparedContext) {
        console.log(
          `Attached ${preparedContext.sourceLabel}${options.allowUnredacted ? '' : ` with ${preparedContext.redactionCount} redaction${preparedContext.redactionCount === 1 ? '' : 's'}`}.`,
        );
      } else if (options.diff) {
        console.log('No git diff changes found to attach.');
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }

    const finalPrompt = preparedContext?.content
      ? `${prompt}\n\nHere is the target code context for this request:\n\`\`\`\n${preparedContext.content}\n\`\`\``
      : prompt;

    console.log(`Uplinking to Vertex REST API [${PROJECT_ID}/${LOCATION}/${MODEL}] via API key.`);
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
        throw new Error('Vertex AI returned an empty response.');
      }
      process.stdout.write('\n\nUplink complete.\n');

    } catch (error) {
      spinner.stop();
      console.error('\nVertex AI uplink failed:', error instanceof Error ? error.message : String(error));
      console.error('Check your API Key routing and billing settings in Google Cloud.');
      process.exitCode = 1;
    }
  });
