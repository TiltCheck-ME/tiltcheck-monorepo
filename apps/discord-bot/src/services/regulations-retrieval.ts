import { Client as ESClient } from '@elastic/elasticsearch';

const REGULATIONS_INDEX = 'tiltcheck-regulations-us-v1';

export interface RegulationStatusRow {
  state_name: string;
  topic: string;
  subtopic: string;
  status: string;
  effective_date: string;
  last_reviewed_at: string;
  summary: string;
}

export interface RegulationReviewRow {
  state_code: string;
  topic: string;
  subtopic: string;
  status: string;
  next_review_due: string;
  last_reviewed_at: string;
}

interface EsqlResponse {
  columns?: Array<{ name: string }>;
  rows?: Array<Array<string | number | null>>;
}

function escapeEsqlString(value: string): string {
  return value.replace(/"/g, '\\"');
}

function mapRows<T>(
  response: EsqlResponse,
): T[] {
  const columns = response.columns ?? [];
  const rows = response.rows ?? [];

  return rows.map((row) => {
    const mapped = Object.fromEntries(columns.map((c, i) => [c.name, row[i] ?? '']));
    return mapped as T;
  });
}

export function buildStateTopicStatusEsql(stateCode: string, topic: string): string {
  const safeStateCode = escapeEsqlString(stateCode.toUpperCase());
  const safeTopic = escapeEsqlString(topic.toLowerCase());

  return `
FROM ${REGULATIONS_INDEX}
| WHERE jurisdiction.state_code == "${safeStateCode}" AND topic == "${safeTopic}" AND source_quality == "primary"
| KEEP jurisdiction.state_name, topic, subtopic, status, effective_date, last_reviewed_at, summary
| RENAME jurisdiction.state_name AS state_name
| SORT effective_date DESC
`.trim();
}

export function buildReviewOverdueEsql(): string {
  return `
FROM ${REGULATIONS_INDEX}
| WHERE next_review_due <= NOW() AND source_quality == "primary"
| KEEP jurisdiction.state_code, topic, subtopic, status, next_review_due, last_reviewed_at
| RENAME jurisdiction.state_code AS state_code
| SORT next_review_due ASC
`.trim();
}

export async function getStateTopicStatus(
  client: ESClient,
  stateCode: string,
  topic: string,
): Promise<RegulationStatusRow[]> {
  const query = buildStateTopicStatusEsql(stateCode, topic);
  const response = (await client.esql.query({ query, format: 'json' })) as EsqlResponse;
  return mapRows<RegulationStatusRow>(response);
}

export async function listReviewOverdueRegulations(
  client: ESClient,
): Promise<RegulationReviewRow[]> {
  const query = buildReviewOverdueEsql();
  const response = (await client.esql.query({ query, format: 'json' })) as EsqlResponse;
  return mapRows<RegulationReviewRow>(response);
}

