#!/usr/bin/env node
/* tools/preview-email.mjs — render the buyer's transactional emails to disk
 * ---------------------------------------------------------------------------
 *   node tools/preview-email.mjs
 *   node tools/preview-email.mjs --niche landscaping --city "Boise, ID" --name "Sam Rivera"
 *   node tools/preview-email.mjs --which welcome
 *
 * WHY THIS EXISTS. sendWelcome() and sendLoginLink() build their HTML inline
 * and hand it straight to Brevo, so until now the only way to see either email
 * was to send one to a real mailbox. These are inline-styled tables written for
 * Gmail and Outlook; a layout bug in one reaches a paying buyer before it
 * reaches us.
 *
 * IT DOES NOT COPY THE COPY. tools/resend-welcome.mjs already sets the rule —
 * import the real function, never duplicate it — because a second copy of the
 * wording drifts from the one that actually sends. This goes further and
 * captures the outgoing Brevo REQUEST BODY: what you open in a browser is the
 * exact htmlContent that would have crossed the wire, not a re-render of it.
 * If the email changes, this output changes with it and cannot fall behind.
 *
 * NOTHING IS SENT. globalThis.fetch is replaced BEFORE the webhook module is
 * imported, so the Brevo call is intercepted rather than performed. The API key
 * below is a placeholder whose only job is to get past sendBrevo's "no API key"
 * guard — with no key set, sendBrevo returns early and there is nothing to
 * capture. No network call leaves this process.
 *
 * LOCAL ONLY. Output lands in .preview/, which is git-ignored. Named in
 * .vercelignore beside brevo-diag.mjs and resend-welcome.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i > -1 ? argv[i + 1] : d; };

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node tools/preview-email.mjs [--which welcome|login|both]\n' +
              '                                    [--niche <name>] [--city "City, ST"]\n' +
              '                                    [--name <operator>] [--out <dir>]');
  process.exit(0);
}

const which   = arg('--which', 'both');
const niche   = arg('--niche', 'landscaping');
const cityArg = arg('--city', 'Boise, ID');
const who     = arg('--name', 'Sam Rivera');
const outDir  = arg('--out', '.preview');

if (!['welcome', 'login', 'both'].includes(which)) {
  console.error('--which must be welcome, login, or both');
  process.exit(2);
}

/* "City, ST" is how the emails render a territory, so it is how this takes it.
   Splitting here keeps the sample data shaped like a real sbv_intake row. */
const m = String(cityArg).match(/^\s*(.+?)\s*,\s*([A-Za-z]{2})\s*$/);
if (!m) { console.error('--city must look like "Boise, ID"'); process.exit(2); }
const [, cityLabel, stateCode] = m;

/* Placeholder only — see the header. Set before the import below, because
   _shared.mjs reads its constants once at module load. */
process.env.BREVO_API_KEY = process.env.BREVO_API_KEY || 'preview-not-a-real-key';

/* Intercept the Brevo POST. Anything else that tries to reach the network
   during this run is a surprise worth failing on rather than silently
   allowing. */
const captured = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://api.brevo.com/')) {
    captured.push(JSON.parse(init.body));
    return { ok: true, status: 201, text: async () => '{}', json: async () => ({}) };
  }
  throw new Error('preview-email made an unexpected network call to ' + u);
};

/* Imported dynamically so the env var and the fetch stub are both in place
   first. Importing the webhook module is what guarantees this previews the
   real thing. */
const { sendWelcome, sendLoginLink } = await import('../api/stripe-webhook.mjs');

/* Shaped like the sbv_intake row each function reads. Deliberately obvious
   sample data: no real buyer, and nothing that reads as a claim about money. */
const intake = {
  operator_name: who,
  business_name: who,
  operator_email: 'operator@example.com',
  city_label: cityLabel,
  state_code: stateCode.toUpperCase(),
  niche_slug: niche,
};
const clientId  = 'sample-operator';
const nicheName = niche.replace(/-/g, ' ');

fs.mkdirSync(outDir, { recursive: true });

async function render(label, fn) {
  captured.length = 0;
  await fn();
  if (!captured.length) {
    console.error('! ' + label + ': sendBrevo skipped the send, nothing captured.');
    return null;
  }
  const mail = captured[0];
  const htmlPath = path.join(outDir, label + '.html');
  const textPath = path.join(outDir, label + '.txt');
  /* The htmlContent is a bare <div> — a fragment, not a document. Wrapping it
     in minimal scaffolding is what lets a browser show it at a sane width;
     the fragment itself is byte-for-byte what Brevo would have received. */
  fs.writeFileSync(htmlPath,
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + mail.subject + '</title>' +
    '<style>body{margin:0;background:#F1F4F8;padding:24px}' +
    '.sheet{background:#fff;max-width:600px;margin:0 auto;padding:24px;' +
    'border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
    '.meta{max-width:600px;margin:0 auto 16px;font:12px/1.5 monospace;color:#48515F}' +
    '</style></head><body>' +
    '<div class="meta">To: ' + mail.to[0].email + '  &middot;  Subject: ' + mail.subject +
    '<br>PREVIEW ONLY — generated by tools/preview-email.mjs, not sent.</div>' +
    '<div class="sheet">' + mail.htmlContent + '</div></body></html>', 'utf8');
  fs.writeFileSync(textPath, 'Subject: ' + mail.subject + '\n\n' + mail.textContent, 'utf8');
  return { subject: mail.subject, htmlPath, textPath };
}

const out = [];
if (which === 'welcome' || which === 'both') {
  out.push(await render('welcome', () => sendWelcome(intake, clientId, nicheName)));
}
if (which === 'login' || which === 'both') {
  out.push(await render('login-link', () =>
    sendLoginLink(intake, clientId, intake.operator_email,
                  'https://systemsbyvega.com/admin/#sample-token')));
}

globalThis.fetch = realFetch;

console.log('');
for (const r of out.filter(Boolean)) {
  console.log('  ' + r.subject);
  console.log('    ' + r.htmlPath);
  console.log('    ' + r.textPath);
}
console.log('\nNothing was sent. Open the .html files in a browser.\n');
