#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LINEAR_URL = "https://api.linear.app/graphql";
const PRIORITY_MIN = 0;
const PRIORITY_MAX = 4;

function parseArgs(argv) {
  const args = {
    file: "docs/ops/linear-tasks.json",
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; ) {
    const arg = argv[i];
    if (arg === "--file") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --file");
      }
      args.file = value;
      i += 2;
      continue;
    }
    if (arg.startsWith("--file=")) {
      const value = arg.slice("--file=".length).trim();
      if (!value) {
        throw new Error("Missing value for --file");
      }
      args.file = value;
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/linear-sync.mjs [--file docs/ops/linear-tasks.json] [--dry-run]

Required environment variables:
  LINEAR_API_KEY
  LINEAR_TEAM_KEY

Optional environment variables:
  LINEAR_PROJECT_ID

Task file format:
  {
    "tasks": [
      {
        "key": "M1-FOUNDATION",
        "title": "Set GCP project baseline",
        "description": "Create project, billing, IAM bootstrap.",
        "priority": 2
      }
    ]
  }`);
}

async function gql(apiKey, query, variables = {}) {
  const response = await fetch(LINEAR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API HTTP ${response.status}`);
  }

  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  return body.data;
}

function mustEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function loadTasks(filePath) {
  const absolutePath = resolve(filePath);
  const raw = readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.tasks)) {
    throw new Error(`Expected "tasks" array in ${absolutePath}`);
  }
  return parsed.tasks.map((task, idx) => normalizeTask(task, idx + 1));
}

function normalizeTask(task, row) {
  if (!task || typeof task !== "object") {
    throw new Error(`Task ${row}: expected object`);
  }
  if (!task.key || !String(task.key).trim()) {
    throw new Error(`Task ${row}: "key" is required`);
  }
  if (!task.title || !String(task.title).trim()) {
    throw new Error(`Task ${row}: "title" is required`);
  }

  const normalized = {
    key: String(task.key).trim(),
    title: String(task.title).trim(),
    description: String(task.description ?? "").trim(),
    priority: Number(task.priority ?? 0),
  };

  if (!Number.isFinite(normalized.priority)) {
    throw new Error(`Task ${row}: "priority" must be a number`);
  }
  if (normalized.priority < PRIORITY_MIN || normalized.priority > PRIORITY_MAX) {
    throw new Error(
      `Task ${row}: "priority" must be between ${PRIORITY_MIN} and ${PRIORITY_MAX}`,
    );
  }

  return normalized;
}

async function resolveTeamId(apiKey, teamKey) {
  const data = await gql(
    apiKey,
    `query TeamByKey($teamKey: String!) {
      teams(filter: { key: { eq: $teamKey } }) {
        nodes { id key name }
      }
    }`,
    { teamKey },
  );
  const team = data?.teams?.nodes?.[0];
  if (!team) {
    throw new Error(`Linear team not found for key "${teamKey}"`);
  }
  return team.id;
}

async function resolveUnstartedStateId(apiKey, teamId) {
  const data = await gql(
    apiKey,
    `query DefaultState($teamId: String!) {
      workflowStates(filter: { team: { id: { eq: $teamId } }, type: { eq: unstarted } }, first: 1) {
        nodes { id name }
      }
    }`,
    { teamId },
  );

  return data?.workflowStates?.nodes?.[0]?.id ?? null;
}

async function findExistingIssue(apiKey, teamId, marker, title) {
  const data = await gql(
    apiKey,
    `query SearchIssues($query: String!) {
      issueSearch(query: $query, first: 25) {
        nodes {
          id
          title
          identifier
          description
          team { id key }
        }
      }
    }`,
    { query: `${title} ${marker}` },
  );

  const nodes = data?.issueSearch?.nodes ?? [];
  return (
    nodes.find((n) => n.team?.id === teamId && String(n.description ?? "").includes(marker)) ??
    nodes.find((n) => n.team?.id === teamId && n.title === title) ??
    null
  );
}

async function createIssue(apiKey, input) {
  const data = await gql(
    apiKey,
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url }
      }
    }`,
    { input },
  );
  if (!data?.issueCreate?.success) {
    throw new Error(`Linear issueCreate returned success=false for "${input.title}"`);
  }
  return data.issueCreate.issue;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const linearApiKey = mustEnv("LINEAR_API_KEY");
  const linearTeamKey = mustEnv("LINEAR_TEAM_KEY");
  const linearProjectId = (process.env.LINEAR_PROJECT_ID ?? "").trim();
  const tasks = loadTasks(args.file);

  if (tasks.length === 0) {
    console.log("No tasks found. Nothing to sync.");
    return;
  }

  console.log(`Loaded ${tasks.length} task(s) from ${args.file}`);
  console.log(`Target team: ${linearTeamKey}`);
  if (args.dryRun) {
    console.log("Dry run enabled: no issues will be created.");
  }

  const teamId = await resolveTeamId(linearApiKey, linearTeamKey);
  const unstartedStateId = await resolveUnstartedStateId(linearApiKey, teamId);
  if (!unstartedStateId) {
    console.warn("Warning: no unstarted workflow state found, using team default.");
  }

  let created = 0;
  let skipped = 0;

  for (const task of tasks) {
    const marker = `[tc-task:${task.key}]`;
    const description = task.description
      ? `${task.description}\n\n${marker}`
      : `Task synced from docs/ops/linear-tasks.json.\n\n${marker}`;

    const existing = await findExistingIssue(linearApiKey, teamId, marker, task.title);
    if (existing) {
      skipped += 1;
      console.log(`Skip existing ${existing.identifier}: ${task.title}`);
      continue;
    }

    const input = {
      teamId,
      title: task.title,
      description,
      priority: task.priority,
      ...(linearProjectId ? { projectId: linearProjectId } : {}),
      ...(unstartedStateId ? { stateId: unstartedStateId } : {}),
    };

    if (args.dryRun) {
      created += 1;
      console.log(`Would create: ${task.title} ${marker}`);
      continue;
    }

    const issue = await createIssue(linearApiKey, input);
    created += 1;
    console.log(`Created ${issue.identifier}: ${issue.title}`);
  }

  console.log("");
  console.log(`Done. Created: ${created}, skipped existing: ${skipped}`);
}

main().catch((error) => {
  console.error(`linear-sync failed: ${error.message}`);
  process.exit(1);
});
