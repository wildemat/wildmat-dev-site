export function loginPage(error?: string): string {
  const errorBlock = error
    ? `<p class="error">${error}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — wildmat.dev</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #141414;
      border: 1px solid #262626;
      border-radius: 12px;
      padding: 2.5rem;
      width: 100%;
      max-width: 380px;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      text-align: center;
      color: #fafafa;
    }
    label {
      display: block;
      font-size: 0.875rem;
      color: #a3a3a3;
      margin-bottom: 0.5rem;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.625rem 0.875rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 8px;
      color: #fafafa;
      font-size: 0.9375rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus {
      border-color: #666;
    }
    button {
      width: 100%;
      margin-top: 1.25rem;
      padding: 0.625rem;
      background: #fafafa;
      color: #0a0a0a;
      border: none;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .error {
      background: #2d1215;
      border: 1px solid #5c2127;
      color: #f87171;
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <form class="card" method="POST" action="/auth/login">
    <h1>wildmat.dev</h1>
    ${errorBlock}
    <label for="password">Password</label>
    <input type="password" id="password" name="password" required autofocus>
    <button type="submit">Continue</button>
  </form>
</body>
</html>`;
}
