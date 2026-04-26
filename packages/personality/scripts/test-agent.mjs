#!/usr/bin/env node
// Test the deployed personality MCP server as if we were an agent.
// Loads PERSONALITY_API_KEY from packages/personality/.env.
//
// Usage:
//   node scripts/test-agent.mjs                       # runs all tests
//   node scripts/test-agent.mjs health
//   node scripts/test-agent.mjs get voice
//   node scripts/test-agent.mjs respond "content..." [platform]
//   node scripts/test-agent.mjs mcp                   # full MCP JSON-RPC round trip

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

function loadEnv() {
  try {
    const text = readFileSync(envPath, 'utf8');
    const out = {};
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
const API_KEY = env.PERSONALITY_API_KEY;
const ENDPOINT = env.PERSONALITY_ENDPOINT ?? 'https://api.wildmat.dev/personality';

if (!API_KEY) {
  console.error('missing PERSONALITY_API_KEY — expected in packages/personality/.env or env');
  process.exit(1);
}

const headers = {
  'content-type': 'application/json',
  'x-api-key': API_KEY,
};

async function call(method, path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function rpc(method, params) {
  const id = Math.floor(Math.random() * 1e9);
  const res = await fetch(`${ENDPOINT}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

function section(title) {
  console.log(`\n━━━ ${title} ━━━`);
}

function pretty(x) {
  console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 2));
}

async function testHealth() {
  section(`GET ${ENDPOINT}/health`);
  pretty(await call('GET', '/health'));
}

async function testGetPersonality(facet = 'voice') {
  section(`GET ${ENDPOINT}/facets/${facet}`);
  const { status, data } = await call('GET', `/facets/${facet}`);
  console.log('status:', status);
  if (data && data.content) {
    console.log('facet:', data.facet);
    console.log('content (first 500 chars):');
    console.log(data.content.slice(0, 500) + (data.content.length > 500 ? '\n...[truncated]' : ''));
  } else {
    pretty(data);
  }
}

async function testRespond(content, platform = 'twitter') {
  section(`POST ${ENDPOINT}/respond — platform=${platform}`);
  console.log('content:', content);
  const { status, data } = await call('POST', '/respond', { content, platform });
  console.log('status:', status);
  pretty(data);
}

async function testMcp() {
  section('MCP — initialize');
  pretty(await rpc('initialize', {
    protocolVersion: '2024-11-05',
    clientInfo: { name: 'test-agent.mjs', version: '1.0.0' },
    capabilities: {},
  }));

  section('MCP — tools/list');
  pretty(await rpc('tools/list'));

  section('MCP — tools/call respond');
  pretty(await rpc('tools/call', {
    name: 'respond',
    arguments: {
      content: 'just shipped my first cloudflare worker and it actually works first try lol',
      platform: 'twitter',
    },
  }));
}

async function runAll() {
  await testHealth();
  await testGetPersonality('voice');
  await testRespond(
    'hot take: typescript is just a linter with extra steps',
    'twitter',
  );
  await testRespond(
    "hey team — finally merged the migration. took way longer than expected but the new schema is so much cleaner. thanks everyone for putting up with my PR comments this week",
    'slack',
  );
}

const [cmd, ...args] = process.argv.slice(2);

try {
  switch (cmd) {
    case undefined:
    case 'all':
      await runAll();
      break;
    case 'health':
      await testHealth();
      break;
    case 'get':
      await testGetPersonality(args[0] ?? 'voice');
      break;
    case 'respond':
      await testRespond(args[0] ?? 'hello world', args[1] ?? 'twitter');
      break;
    case 'mcp':
      await testMcp();
      break;
    default:
      console.error(`unknown command: ${cmd}`);
      process.exit(1);
  }
} catch (e) {
  console.error('error:', e.message);
  process.exit(1);
}
