import { Client as ESClient } from '@elastic/elasticsearch';
import type { TiltAgentContext } from './tilt-agent.js';

const INDEX = 'tiltcheck-user-context';

let _client: ESClient | null = null;

function getClient(): ESClient | null {
  if (_client) return _client;

  const url = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;
  if (!url || !apiKey) return null;

  _client = new ESClient({ node: url, auth: { apiKey } });
  return _client;
}

export async function ensureTiltAgentContextIndex(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const exists = await client.indices.exists({ index: INDEX });
    if (exists) return;

    await client.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          user_id: { type: 'keyword' },
          state_code: { type: 'keyword' },
          regulation_topic: { type: 'keyword' },
        },
      },
    });
  } catch (err) {
    console.error('[TiltContextStore] ensure index failed:', err);
  }
}

export async function saveTiltAgentContext(
  userId: string,
  context: TiltAgentContext,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.index({
      index: INDEX,
      id: userId,
      document: {
        '@timestamp': new Date().toISOString(),
        user_id: userId,
        state_code: context.stateCode,
        regulation_topic: context.regulationTopic,
      },
      refresh: 'wait_for',
    });
  } catch (err) {
    console.error('[TiltContextStore] save failed:', err);
  }
}

export async function loadTiltAgentContext(
  userId: string,
): Promise<TiltAgentContext | undefined> {
  const client = getClient();
  if (!client) return undefined;

  try {
    const resp = await client.get({ index: INDEX, id: userId });
    const src = resp._source as
      | { state_code?: string; regulation_topic?: string }
      | undefined;

    if (!src) return undefined;

    return {
      stateCode: src.state_code,
      regulationTopic: src.regulation_topic,
    };
  } catch (err: any) {
    if (err?.meta?.statusCode === 404) return undefined;
    console.error('[TiltContextStore] load failed:', err);
    return undefined;
  }
}

export async function clearTiltAgentContext(userId: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.delete({ index: INDEX, id: userId, refresh: 'wait_for' });
  } catch (err: any) {
    if (err?.meta?.statusCode === 404) return;
    console.error('[TiltContextStore] clear failed:', err);
  }
}
