# TiltCheck US Regulations in Elasticsearch

## 1) Index Mapping (`tiltcheck-regulations-us-v1`)

```json
PUT tiltcheck-regulations-us-v1
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "regulation_id": { "type": "keyword" },
      "jurisdiction": {
        "properties": {
          "country": { "type": "keyword" },
          "state_code": { "type": "keyword" },
          "state_name": { "type": "keyword" }
        }
      },
      "topic": { "type": "keyword" },
      "subtopic": { "type": "keyword" },
      "status": { "type": "keyword" },
      "effective_date": { "type": "date" },
      "last_reviewed_at": { "type": "date" },
      "next_review_due": { "type": "date" },
      "summary": { "type": "text" },
      "requirements": {
        "type": "nested",
        "properties": {
          "key": { "type": "keyword" },
          "value": { "type": "text" },
          "applies_to": { "type": "keyword" }
        }
      },
      "penalties": {
        "properties": {
          "civil": { "type": "text" },
          "criminal": { "type": "text" },
          "license_impact": { "type": "text" }
        }
      },
      "citations": {
        "type": "nested",
        "properties": {
          "citation": { "type": "keyword" },
          "source_url": { "type": "keyword" },
          "publisher": { "type": "keyword" },
          "published_at": { "type": "date" }
        }
      },
      "source_quality": { "type": "keyword" },
      "version": { "type": "integer" },
      "ingested_at": { "type": "date" },
      "tags": { "type": "keyword" }
    }
  }
}
```

## 2) Ingestion Document Shape

```json
{
  "regulation_id": "US-NJ-IGAMING-LICENSE-001",
  "jurisdiction": {
    "country": "US",
    "state_code": "NJ",
    "state_name": "New Jersey"
  },
  "topic": "igaming",
  "subtopic": "operator_licensing",
  "status": "legal",
  "effective_date": "2025-01-01",
  "last_reviewed_at": "2026-02-20",
  "next_review_due": "2026-03-20",
  "summary": "Online casino operators must maintain active state licensure and approved platform integrations.",
  "requirements": [
    {
      "key": "license_required",
      "value": "Operator must hold an active NJ license.",
      "applies_to": "operator"
    },
    {
      "key": "geofencing_required",
      "value": "Wagers must be geofenced within state boundaries.",
      "applies_to": "platform"
    }
  ],
  "penalties": {
    "civil": "Fines up to statutory maximum per violation.",
    "criminal": "Applies for unlicensed gambling facilitation.",
    "license_impact": "Suspension or revocation possible."
  },
  "citations": [
    {
      "citation": "N.J. Admin. Code 13:69",
      "source_url": "https://example.gov/nj/admin-code-13-69",
      "publisher": "New Jersey Division of Gaming Enforcement",
      "published_at": "2025-12-15"
    }
  ],
  "source_quality": "primary",
  "version": 1,
  "ingested_at": "2026-02-26T00:00:00Z",
  "tags": ["licensing", "igaming", "compliance"]
}
```

## 3) Bulk Ingest Template

```json
POST _bulk
{ "index": { "_index": "tiltcheck-regulations-us-v1", "_id": "US-NJ-IGAMING-LICENSE-001" } }
{ "regulation_id": "US-NJ-IGAMING-LICENSE-001", "jurisdiction": { "country": "US", "state_code": "NJ", "state_name": "New Jersey" }, "topic": "igaming", "subtopic": "operator_licensing", "status": "legal", "effective_date": "2025-01-01", "last_reviewed_at": "2026-02-20", "next_review_due": "2026-03-20", "summary": "Online casino operators must maintain active state licensure.", "requirements": [{ "key": "license_required", "value": "Active NJ license required.", "applies_to": "operator" }], "penalties": { "civil": "Statutory fines.", "criminal": "Possible criminal exposure.", "license_impact": "Suspension possible." }, "citations": [{ "citation": "N.J. Admin. Code 13:69", "source_url": "https://example.gov/nj/admin-code-13-69", "publisher": "NJDGE", "published_at": "2025-12-15" }], "source_quality": "primary", "version": 1, "ingested_at": "2026-02-26T00:00:00Z", "tags": ["igaming"] }
```

## 4) ES|QL Queries

### A) State + Topic status lookup

```sql
FROM tiltcheck-regulations-us-v1
| WHERE jurisdiction.state_code == "NJ" AND topic == "igaming"
| KEEP jurisdiction.state_name, topic, subtopic, status, effective_date, last_reviewed_at, summary
| SORT effective_date DESC
```

### B) Find states where a topic is prohibited/restricted

```sql
FROM tiltcheck-regulations-us-v1
| WHERE topic == "sweepstakes" AND status IN ("restricted", "prohibited")
| STATS latest_effective = MAX(effective_date) BY jurisdiction.state_code, jurisdiction.state_name, status
| SORT status ASC, jurisdiction.state_code ASC
```

### C) Compliance freshness (records needing review)

```sql
FROM tiltcheck-regulations-us-v1
| WHERE next_review_due <= NOW()
| KEEP jurisdiction.state_code, topic, subtopic, status, next_review_due, last_reviewed_at
| SORT next_review_due ASC
```

### D) Citation quality audit

```sql
FROM tiltcheck-regulations-us-v1
| STATS regs = COUNT(*), latest_review = MAX(last_reviewed_at) BY jurisdiction.state_code, source_quality
| SORT jurisdiction.state_code ASC, source_quality ASC
```

### E) 50-state status matrix for a topic

```sql
FROM tiltcheck-regulations-us-v1
| WHERE topic == "sportsbook"
| STATS current_status = VALUES(status) BY jurisdiction.state_code, jurisdiction.state_name
| SORT jurisdiction.state_code ASC
```

## 5) Suggested Next Build Step

1. Add a new service module: `apps/discord-bot/src/services/regulations-retrieval.ts`.
2. Add two methods:
   - `getStateTopicStatus(stateCode, topic)`
   - `listReviewOverdueRegulations()`
3. Start with only `source_quality == "primary"` for safety outputs.
