'use strict';
/* browser.js — the one Chromium resolver, shared by every tool that needs a
   headless browser locally.
 *
 * Lifted verbatim from tools/build-shots.js (Ruling R12), which is where it
 * was written and where it was proven. It lives here now because a second
 * copy of a fallback chain is a chain that drifts, and the copy that drifts is
 * always the one nobody runs.
 *
 * Resolution order, chosen so a missing browser fails LOUDLY naming all three
 * attempts rather than silently producing nothing:
 *   1. SBV_CHROME env var        -> an explicit executablePath
 *   2. channel: 'chrome'         -> local system Chrome
 *   3. the npx playwright cache  -> whatever a previous `npx playwright` left
 *
 * @sparticuz/chromium is a dependency of this repo but is NOT tried here: it
 * is the AWS-Lambda build used by api/marketing-kit.mjs at runtime, and its
 * executablePath is undefined on a normal dev machine (verified).
 */

/* --force-color-profile=srgb matters for anything that measures pixels: without
   it Chrome may render through the display's ICC profile and the numbers move. */
const DEFAULT_ARGS = ['--hide-scrollbars', '--force-color-profile=srgb'];
const NPX_CACHE = 'C:/Users/JasonVega/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright';

async function launchBrowser(opts) {
  const { chromium } = require('playwright-core');
  const attempts = [];
  const o = opts || {};
  const args = o.args || DEFAULT_ARGS;
  const headless = o.headless === undefined ? true : o.headless;

  if (process.env.SBV_CHROME) {
    try {
      return await chromium.launch({ executablePath: process.env.SBV_CHROME, args, headless });
    } catch (e) { attempts.push(`SBV_CHROME=${process.env.SBV_CHROME} -> ${e.message.split('\n')[0]}`); }
  } else {
    attempts.push('SBV_CHROME not set');
  }

  try {
    return await chromium.launch({ channel: 'chrome', args, headless });
  } catch (e) { attempts.push(`channel:'chrome' -> ${e.message.split('\n')[0]}`); }

  try {
    const pw = require(NPX_CACHE);
    return await pw.chromium.launch({ args, headless });
  } catch (e) { attempts.push(`npx cache (${NPX_CACHE}) -> ${e.message.split('\n')[0]}`); }

  throw new Error('No local Chromium found. Attempts:\n  ' + attempts.join('\n  '));
}

module.exports = { launchBrowser, DEFAULT_ARGS };
