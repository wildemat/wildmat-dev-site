import {
  accountBalances,
  budgetStatus,
  listConnections,
  removeConnection,
  spendingSummary,
  syncTransactions,
  upcomingExpenses,
  type Env,
} from './service.js';

const PROTOCOL_VERSION = '2025-03-26';

const TOOLS = [
  {
    name: 'budget_status',
    description: 'Check Plaid configuration, connected institutions, and cached transaction count.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_connections',
    description: 'List connected bank/credit-card institutions (no access tokens).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'sync_transactions',
    description: 'Pull new/changed transactions from Plaid for all connections into the server cache. Run before summarizing recent spending.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'spending_summary',
    description: 'Summarize outflow transactions by category for a date range, from the server cache.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
        include_pending: { type: 'boolean' },
      },
      required: ['start_date', 'end_date'],
      additionalProperties: false,
    },
  },
  {
    name: 'account_balances',
    description: 'Current balance for every account across all connections, bucketed into cash (depository), debt (credit + loans), and investments, with totals and net position (live Plaid call, one per institution).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'upcoming_expenses',
    description: 'List Plaid-detected recurring outflows expected within a number of days (live Plaid call).',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'integer', minimum: 1, maximum: 90 } },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_connection',
    description: 'Remove one bank connection: revokes Plaid access and deletes its cached transactions. Requires confirm=true.',
    inputSchema: {
      type: 'object',
      properties: { item_id: { type: 'string' }, confirm: { type: 'boolean' } },
      required: ['item_id', 'confirm'],
      additionalProperties: false,
    },
  },
];

async function callTool(env: Env, name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'budget_status':
      return budgetStatus(env);
    case 'list_connections':
      return listConnections(env);
    case 'sync_transactions':
      return syncTransactions(env);
    case 'spending_summary':
      return spendingSummary(
        env,
        String(args.start_date),
        String(args.end_date),
        Boolean(args.include_pending),
      );
    case 'account_balances':
      return accountBalances(env);
    case 'upcoming_expenses':
      return upcomingExpenses(env, args.days ? Number(args.days) : 30);
    case 'remove_connection':
      if (!args.confirm) throw new Error('Explicit confirmation (confirm=true) is required');
      return removeConnection(env, String(args.item_id));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: number | string | null, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result };
}

function rpcError(id: number | string | null, code: number, message: string) {
  return { jsonrpc: '2.0' as const, id, error: { code, message } };
}

async function respond(env: Env, req: JsonRpcRequest): Promise<Record<string, unknown> | null> {
  const id = req.id ?? null;
  switch (req.method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'budget-tracker', version: '1.0.0' },
      });
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call': {
      const params = req.params ?? {};
      try {
        const value = await callTool(
          env,
          String(params.name),
          (params.arguments as Record<string, unknown>) ?? {},
        );
        return rpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
          isError: false,
        });
      } catch (err) {
        return rpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify({ error: String(err) }) }],
          isError: true,
        });
      }
    }
    case 'ping':
      return rpcResult(id, {});
    default:
      // Notifications (initialized, cancelled, ...) get no response body.
      if (req.method.startsWith('notifications/')) return null;
      return rpcError(id, -32601, `Method not found: ${req.method}`);
  }
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    // No server-initiated stream; stateless JSON-per-POST only.
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400 });
  }

  const requests = Array.isArray(body) ? body : [body];
  const responses = (await Promise.all(requests.map((r) => respond(env, r)))).filter(
    (r): r is Record<string, unknown> => r !== null,
  );

  if (!responses.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}
