const HOSTS: Record<string, string> = {
  sandbox: 'sandbox.plaid.com',
  development: 'development.plaid.com',
  production: 'production.plaid.com',
};

export interface PlaidEnv {
  PLAID_ENV: string;
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
}

export async function plaid<T = Record<string, unknown>>(
  env: PlaidEnv,
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const host = HOSTS[env.PLAID_ENV?.toLowerCase() ?? 'sandbox'];
  if (!host) throw new Error(`Invalid PLAID_ENV: ${env.PLAID_ENV}`);

  const res = await fetch(`https://${host}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.PLAID_CLIENT_ID,
      secret: env.PLAID_SECRET,
      ...payload,
    }),
  });

  const body = await res.json<T & { error_message?: string }>();
  if (!res.ok) {
    throw new Error(`Plaid ${path} failed (${res.status}): ${body.error_message ?? JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}
