import { plaid } from './plaid.js';

export type Env = {
  SITE_PASSWORD: string;
  AUTH_SECRET: string;
  API_TOKEN: string;
  PLAID_ENV: string;
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  BUDGET_KV: KVNamespace;
  OAUTH_KV: KVNamespace;
  DB: D1Database;
};

export interface Connection {
  item_id: string;
  access_token: string;
  institution_name: string | null;
  added_at: string;
}

export async function listConnections(env: Env, withTokens = false): Promise<Partial<Connection>[]> {
  const list = await env.BUDGET_KV.list({ prefix: 'item:' });
  const connections: Partial<Connection>[] = [];
  for (const key of list.keys) {
    const conn = await env.BUDGET_KV.get<Connection>(key.name, 'json');
    if (!conn) continue;
    connections.push(
      withTokens
        ? conn
        : { item_id: conn.item_id, institution_name: conn.institution_name, added_at: conn.added_at },
    );
  }
  return connections;
}

export async function createLinkToken(env: Env): Promise<{ link_token: string }> {
  const data = await plaid<{ link_token: string }>(env, '/link/token/create', {
    user: { client_user_id: 'wildmat' },
    client_name: 'Budget Tracker',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
  });
  return { link_token: data.link_token };
}

export async function exchangePublicToken(
  env: Env,
  publicToken: string,
  institutionName: string | null,
): Promise<{ item_id: string; institution_name: string | null }> {
  const data = await plaid<{ access_token: string; item_id: string }>(
    env,
    '/item/public_token/exchange',
    { public_token: publicToken },
  );
  const connection: Connection = {
    item_id: data.item_id,
    access_token: data.access_token,
    institution_name: institutionName,
    added_at: new Date().toISOString(),
  };
  await env.BUDGET_KV.put(`item:${data.item_id}`, JSON.stringify(connection));
  return { item_id: data.item_id, institution_name: institutionName };
}

interface PlaidTxn {
  transaction_id: string;
  account_id?: string;
  date?: string;
  name?: string;
  merchant_name?: string;
  amount?: number;
  iso_currency_code?: string;
  unofficial_currency_code?: string;
  pending?: boolean;
  personal_finance_category?: { primary?: string };
}

interface SyncResponse {
  added?: PlaidTxn[];
  modified?: PlaidTxn[];
  removed?: { transaction_id: string }[];
  next_cursor: string;
  has_more?: boolean;
}

export async function syncTransactions(env: Env) {
  const totals = { added: 0, modified: 0, removed: 0 };
  const items = (await listConnections(env, true)) as Connection[];

  const upsert = env.DB.prepare(
    'INSERT OR REPLACE INTO transactions VALUES(?,?,?,?,?,?,?,?,?,?)',
  );
  const del = env.DB.prepare('DELETE FROM transactions WHERE transaction_id=?');

  for (const item of items) {
    const row = await env.DB.prepare('SELECT cursor FROM cursors WHERE item_id=?')
      .bind(item.item_id)
      .first<{ cursor: string }>();
    let cursor: string | null = row?.cursor ?? null;
    let more = true;

    while (more) {
      const payload: Record<string, unknown> = { access_token: item.access_token, count: 500 };
      if (cursor) payload.cursor = cursor;
      const data = await plaid<SyncResponse>(env, '/transactions/sync', payload);

      const statements: D1PreparedStatement[] = [];
      for (const key of ['added', 'modified'] as const) {
        for (const txn of data[key] ?? []) {
          const category = txn.personal_finance_category?.primary ?? 'UNCATEGORIZED';
          statements.push(
            upsert.bind(
              txn.transaction_id,
              item.item_id,
              txn.account_id ?? null,
              txn.date ?? null,
              txn.merchant_name || txn.name || null,
              txn.amount ?? null,
              txn.iso_currency_code ?? txn.unofficial_currency_code ?? null,
              txn.pending ? 1 : 0,
              category,
              JSON.stringify(txn),
            ),
          );
          totals[key] += 1;
        }
      }
      for (const removed of data.removed ?? []) {
        statements.push(del.bind(removed.transaction_id));
        totals.removed += 1;
      }
      if (statements.length) await env.DB.batch(statements);

      cursor = data.next_cursor;
      more = data.has_more ?? false;
    }
    await env.DB.prepare('INSERT OR REPLACE INTO cursors(item_id, cursor) VALUES(?,?)')
      .bind(item.item_id, cursor)
      .run();
  }
  return totals;
}

export async function spendingSummary(
  env: Env,
  startDate: string,
  endDate: string,
  includePending = false,
) {
  const pending = includePending ? '' : ' AND pending=0';
  const { results } = await env.DB.prepare(
    'SELECT category, ROUND(SUM(amount),2) AS total, COUNT(*) AS count FROM transactions WHERE date BETWEEN ? AND ? AND amount>0' +
      pending +
      ' GROUP BY category ORDER BY total DESC',
  )
    .bind(startDate, endDate)
    .all();
  return {
    start_date: startDate,
    end_date: endDate,
    include_pending: includePending,
    categories: results,
    note: 'Plaid transaction amounts above zero are treated as outflows.',
  };
}

interface RecurringStream {
  merchant_name?: string;
  description?: string;
  predicted_next_date?: string;
  last_amount?: unknown;
  average_amount?: unknown;
  frequency?: string;
  status?: string;
}

export async function upcomingExpenses(env: Env, days = 30) {
  const out: Record<string, unknown>[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const items = (await listConnections(env, true)) as Connection[];
  for (const item of items) {
    const data = await plaid<{ outflow_streams?: RecurringStream[] }>(
      env,
      '/transactions/recurring/get',
      { access_token: item.access_token },
    );
    for (const stream of data.outflow_streams ?? []) {
      const predicted = stream.predicted_next_date;
      if (!predicted || predicted < today) continue;
      const diffDays = (Date.parse(predicted) - Date.parse(today)) / 86_400_000;
      if (diffDays <= days) {
        out.push({
          name: stream.merchant_name || stream.description,
          predicted_date: predicted,
          last_amount: stream.last_amount,
          average_amount: stream.average_amount,
          frequency: stream.frequency,
          status: stream.status,
        });
      }
    }
  }
  out.sort((a, b) => String(a.predicted_date).localeCompare(String(b.predicted_date)));
  return { horizon_days: days, expenses: out, estimated: true };
}

interface PlaidAccount {
  account_id: string;
  name?: string;
  official_name?: string;
  mask?: string;
  type?: string;
  subtype?: string;
  balances?: { current?: number; available?: number; iso_currency_code?: string };
}

export async function accountBalances(env: Env) {
  const items = (await listConnections(env, true)) as Connection[];
  const accounts: Record<string, unknown>[] = [];
  const totals = { cash: 0, debt: 0, investments: 0, other: 0 };

  for (const item of items) {
    const data = await plaid<{ accounts?: PlaidAccount[] }>(env, '/accounts/get', {
      access_token: item.access_token,
    });
    for (const acct of data.accounts ?? []) {
      const current = acct.balances?.current ?? 0;
      // Plaid account types: depository=cash, credit/loan=debt (balance is amount owed).
      const bucket =
        acct.type === 'depository' ? 'cash'
        : acct.type === 'credit' || acct.type === 'loan' ? 'debt'
        : acct.type === 'investment' ? 'investments'
        : 'other';
      totals[bucket] += current;
      accounts.push({
        institution: item.institution_name,
        name: acct.name ?? acct.official_name,
        mask: acct.mask,
        type: acct.type,
        subtype: acct.subtype,
        current_balance: current,
        available_balance: acct.balances?.available ?? null,
        currency: acct.balances?.iso_currency_code ?? 'USD',
        bucket,
      });
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    totals: {
      cash: round(totals.cash),
      debt: round(totals.debt),
      investments: round(totals.investments),
      other: round(totals.other),
      net_cash_minus_debt: round(totals.cash - totals.debt),
    },
    accounts,
    note: 'Balances are as of Plaid’s last refresh for each institution, not real-time.',
  };
}

export async function removeConnection(env: Env, itemId: string) {
  const conn = await env.BUDGET_KV.get<Connection>(`item:${itemId}`, 'json');
  if (!conn) throw new Error('Connection not found');
  await plaid(env, '/item/remove', { access_token: conn.access_token });
  await env.BUDGET_KV.delete(`item:${itemId}`);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM transactions WHERE item_id=?').bind(itemId),
    env.DB.prepare('DELETE FROM cursors WHERE item_id=?').bind(itemId),
  ]);
  return { removed: true, item_id: itemId };
}

export async function budgetStatus(env: Env) {
  const connections = await listConnections(env);
  const txns = await env.DB.prepare('SELECT COUNT(*) AS n FROM transactions').first<{ n: number }>();
  return {
    plaid_environment: env.PLAID_ENV,
    connections: connections.length,
    institutions: connections.map((c) => c.institution_name),
    cached_transactions: txns?.n ?? 0,
  };
}
