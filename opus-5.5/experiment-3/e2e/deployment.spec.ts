import { expect, test } from '@playwright/test';

// Checks the production image's HTTP behaviour. Runs only against a deployment (BASE_URL set),
// because the Vite preview server does not send these headers.
test.skip(!process.env.BASE_URL, 'Set BASE_URL to the running container to check its headers.');

test('health check and security headers', async ({ request }) => {
  const health = await request.get('/healthz');
  expect(health.status()).toBe(200);
  expect((await health.text()).trim()).toBe('ok');

  const page = await request.get('/');
  expect(page.status()).toBe(200);
  const html = await page.text();
  const csp = page.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  // Inline styles stay allowed so readability / text-spacing tools work (WCAG 1.4.12).
  expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  expect(page.headers()['x-content-type-options']).toBe('nosniff');
  expect(page.headers()['referrer-policy']).toBe('no-referrer');
  expect(page.headers()['cache-control']).toBe('no-cache');

  const asset = html.match(/\/assets\/[^"]+\.js/)![0];
  const js = await request.get(asset);
  expect(js.status()).toBe(200);
  expect(js.headers()['content-security-policy']).toContain("script-src 'self'");
  expect(js.headers()['x-content-type-options']).toBe('nosniff');
  expect(js.headers()['referrer-policy']).toBe('no-referrer');
  expect(js.headers()['cache-control']).toContain('immutable');
});
