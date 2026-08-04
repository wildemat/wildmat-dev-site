export function budgetPage(plaidEnv: string): string {
  const envBadge = plaidEnv === 'production'
    ? ''
    : `<span class="badge">${plaidEnv}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Budget — wildmat.dev</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      min-height: 100vh;
      padding: 3rem 1.5rem;
    }
    .container { max-width: 640px; margin: 0 auto; }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
    }
    h1 { font-size: 1.5rem; font-weight: 600; color: #fafafa; }
    .badge {
      background: #422006;
      border: 1px solid #92610e;
      color: #fbbf24;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      margin-left: 0.75rem;
      vertical-align: middle;
    }
    .actions { display: flex; gap: 0.75rem; }
    button {
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.4; cursor: default; }
    .primary { background: #fafafa; color: #0a0a0a; }
    .danger {
      background: transparent;
      border: 1px solid #5c2127;
      color: #f87171;
      font-size: 0.8125rem;
      padding: 0.35rem 0.75rem;
    }
    .card {
      background: #141414;
      border: 1px solid #262626;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .card .name { font-weight: 500; color: #fafafa; }
    .card .meta { font-size: 0.8125rem; color: #737373; margin-top: 0.2rem; }
    .empty {
      border: 1px dashed #333;
      border-radius: 12px;
      padding: 2.5rem;
      text-align: center;
      color: #737373;
      font-size: 0.9375rem;
    }
    .status {
      font-size: 0.8125rem;
      color: #a3a3a3;
      min-height: 1.25rem;
      margin-bottom: 1rem;
    }
    .status.error { color: #f87171; }
    a.logout { color: #737373; font-size: 0.8125rem; text-decoration: none; }
    a.logout:hover { color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Budget Tracker${envBadge}</h1>
      <div class="actions">
        <button class="primary" id="add-btn">Add bank connection</button>
        <a class="logout" href="/budget/auth/logout">Log out</a>
      </div>
    </header>
    <p class="status" id="status"></p>
    <div id="connections"></div>
  </div>

  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <script>
    const statusEl = document.getElementById('status');
    const listEl = document.getElementById('connections');
    const addBtn = document.getElementById('add-btn');

    function setStatus(msg, isError) {
      statusEl.textContent = msg || '';
      statusEl.className = 'status' + (isError ? ' error' : '');
    }

    async function api(path, opts) {
      const res = await fetch('/budget/api' + path, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body.slice(0, 300) || res.statusText);
      }
      return res.json();
    }

    async function loadConnections() {
      const { connections } = await api('/connections');
      if (!connections.length) {
        listEl.innerHTML = '<div class="empty">No bank connections yet. Add one to get started.</div>';
        return;
      }
      listEl.innerHTML = '';
      for (const c of connections) {
        const card = document.createElement('div');
        card.className = 'card';
        const added = new Date(c.added_at).toLocaleDateString();
        card.innerHTML =
          '<div><div class="name"></div><div class="meta">Connected ' + added + '</div></div>';
        card.querySelector('.name').textContent = c.institution_name || c.item_id;
        const btn = document.createElement('button');
        btn.className = 'danger';
        btn.textContent = 'Remove';
        btn.onclick = () => removeConnection(c.item_id, c.institution_name);
        card.appendChild(btn);
        listEl.appendChild(card);
      }
    }

    async function removeConnection(itemId, name) {
      if (!confirm('Remove ' + (name || itemId) + '? This revokes access at Plaid and deletes the connection.')) return;
      setStatus('Removing…');
      try {
        await api('/connections/' + encodeURIComponent(itemId), { method: 'DELETE' });
        setStatus('Removed.');
        await loadConnections();
      } catch (err) {
        setStatus('Remove failed: ' + err.message, true);
      }
    }

    addBtn.onclick = async () => {
      addBtn.disabled = true;
      setStatus('Creating link token…');
      try {
        const { link_token } = await api('/link-token', { method: 'POST', body: '{}' });
        const handler = Plaid.create({
          token: link_token,
          onSuccess: async (publicToken, metadata) => {
            setStatus('Saving connection…');
            try {
              await api('/exchange', {
                method: 'POST',
                body: JSON.stringify({
                  public_token: publicToken,
                  institution_name: metadata.institution ? metadata.institution.name : null,
                }),
              });
              setStatus('Connected.');
              await loadConnections();
            } catch (err) {
              setStatus('Exchange failed: ' + err.message, true);
            }
          },
          onExit: (err) => {
            if (err) setStatus('Link exited: ' + (err.display_message || err.error_code), true);
            else setStatus('');
          },
        });
        handler.open();
        setStatus('');
      } catch (err) {
        setStatus('Could not start Plaid Link: ' + err.message, true);
      } finally {
        addBtn.disabled = false;
      }
    };

    loadConnections().catch((err) => setStatus('Failed to load connections: ' + err.message, true));
  </script>
</body>
</html>`;
}
