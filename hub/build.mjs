#!/usr/bin/env node
// Builds every app listed in hub/apps.json into _site/<path>/ and renders the
// hub homepage at _site/index.html, ready to upload to GitHub Pages.
//
//   node hub/build.mjs               install + build all apps, then the hub
//   node hub/build.mjs --skip-apps   only re-render the hub page
//   node hub/build.mjs --ci          use `npm ci` and fail if any app fails

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hubDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(hubDir, '..');
const site = join(root, '_site');
const args = new Set(process.argv.slice(2));
const skipApps = args.has('--skip-apps');
const ci = args.has('--ci') || process.env.CI === 'true';

const manifest = JSON.parse(readFileSync(join(hubDir, 'apps.json'), 'utf8'));
const failed = [];

if (!skipApps) rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

for (const model of manifest.models) {
  for (const app of model.apps) {
    const src = join(root, app.source);
    const out = join(site, app.path);
    app.title = readTitle(src);
    app.docs = existsSync(join(src, 'docs'));
    app.demo = existsSync(join(src, 'demo.mp4'));
    if (skipApps) {
      app.built = existsSync(join(out, 'index.html'));
      continue;
    }
    const label = `${model.name} / experiment ${app.experiment} (${app.source})`;
    console.log(`\n▶ Building ${label}`);
    try {
      const run = (cmd) => execSync(cmd, { cwd: src, stdio: 'inherit' });
      if (ci || !existsSync(join(src, 'node_modules'))) run('npm ci --no-audit --no-fund');
      // Relative base so the app works from any sub-path on github.io.
      run(`npm run build -- --base=./ --outDir="${out}" --emptyOutDir`);
      app.built = true;
    } catch {
      app.built = false;
      failed.push(label);
      console.error(ci ? `::error::Build failed: ${label}` : `✖ Build failed: ${label}`);
    }
  }
}

cpSync(join(hubDir, 'hub.css'), join(site, 'hub.css'));
writeFileSync(join(site, 'index.html'), renderHub(manifest));
writeFileSync(join(site, '.nojekyll'), '');
console.log(`\n✔ Hub written to ${join(site, 'index.html')}`);

if (failed.length) {
  console.error(`\n${failed.length} app(s) failed to build:\n  ${failed.join('\n  ')}`);
  if (ci) process.exit(1);
}

function readTitle(src) {
  try {
    const html = readFileSync(join(src, 'index.html'), 'utf8');
    const title = html.match(/<title>([^<]*)<\/title>/i)?.[1].trim();
    if (title) return decodeEntities(title);
  } catch {}
  try {
    const name = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8')).name;
    if (name) return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {}
  return 'Untitled app';
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderHub({ repo, experiments, models }) {
  const tree = (p) => `${repo}/tree/master/${p}`;
  const blob = (p) => `${repo}/blob/master/${p}`;
  const expIds = Object.keys(experiments);

  const card = (model, app) => {
    const ctx = `${model.name}, experiment ${app.experiment}`;
    const links = [
      `<a href="${esc(tree(app.source))}">Source<span class="vh"> for ${esc(ctx)}</span></a>`,
      app.docs && `<a href="${esc(tree(app.source + '/docs'))}">Docs<span class="vh"> for ${esc(ctx)}</span></a>`,
      app.demo && `<a href="${esc(blob(app.source + '/demo.mp4'))}">Demo video<span class="vh"> for ${esc(ctx)}</span></a>`,
    ].filter(Boolean);
    const open = app.built
      ? `<a class="open" href="./${esc(app.path)}/">Open app<span class="vh">: ${esc(app.title)} (${esc(ctx)})</span></a>`
      : `<p class="unavailable">Not available in this deployment</p>`;
    return `
          <li class="card">
            <p class="exp-tag" aria-hidden="true">Experiment ${esc(app.experiment)}</p>
            <h3><span class="vh">Experiment ${esc(app.experiment)}: </span>${esc(app.title)}</h3>
            ${open}
            <ul class="links" aria-label="Links for ${esc(ctx)}">${links.map((l) => `<li>${l}</li>`).join('')}</ul>
          </li>`;
  };

  const total = models.reduce((n, m) => n + m.apps.length, 0);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Notes Kanban Experiments</title>
  <meta name="description" content="${total} React notes and Kanban apps built by different AI models under three prompting experiments." />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232f5bd3'/%3E%3Crect x='6' y='7' width='5.5' height='18' rx='1.5' fill='white'/%3E%3Crect x='13.25' y='7' width='5.5' height='12' rx='1.5' fill='white'/%3E%3Crect x='20.5' y='7' width='5.5' height='15' rx='1.5' fill='white'/%3E%3C/svg%3E" />
  <link rel="stylesheet" href="./hub.css" />
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="masthead">
    <div class="wrap">
      <p class="eyebrow">Foundations of Software Engineering</p>
      <h1>Notes Kanban Experiments</h1>
      <p class="lede">The same notes and Kanban board app, built ${total} times: by ${models.length} AI models across ${expIds.length} prompting experiments. Open any build to compare them side by side.</p>
    </div>
  </header>

  <main id="main" class="wrap">
    <section aria-labelledby="exp-heading" class="experiments">
      <h2 id="exp-heading">The experiments</h2>
      <ol class="exp-list">${expIds
        .map((id) => `
        <li><span class="num" aria-hidden="true">${esc(id)}</span><div><h3>Experiment ${esc(id)}</h3><p>${esc(experiments[id])}</p></div></li>`)
        .join('')}
      </ol>
    </section>

    ${models
      .map((model, i) => `
    <section aria-labelledby="model-${i}" class="model">
      <h2 id="model-${i}">${esc(model.name)}</h2>
      <ul class="grid">${model.apps.map((app) => card(model, app)).join('')}
      </ul>
    </section>`)
      .join('')}
  </main>

  <footer class="wrap footer">
    <p>Each app stores its notes in your browser's local storage, which is shared by all apps on this site. <a href="${esc(repo)}">View the repository on GitHub</a>.</p>
  </footer>
</body>
</html>
`;
}
