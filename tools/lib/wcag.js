'use strict';
/* wcag.js — WCAG 2.1 relative luminance, contrast ratio, and the sRGB
 * source-over composite, in ONE place.
 *
 * `lum` and `ratio` are lifted verbatim from the pair that lived inside
 * tools/a11y-sweep.js's PROBE. a11y-sweep now injects SRC into the page
 * instead of carrying its own copy, and tools/build-scrim.js requires these
 * functions directly — so there is exactly one definition of this arithmetic
 * in the repo, and it runs byte-identically in Node and in the browser.
 *
 * Colours are {r,g,b} in 0-255 sRGB. Alpha is ignored by `lum` — callers that
 * need to flatten a translucent layer call `composite` first.
 */

/* The functions as TEXT, so they can be injected into a page context where
   require() does not exist. Node re-derives its own copies from this same
   string below; if the string and the module could disagree we would be back
   to the two-copies problem this file exists to kill. */
const SRC = `
(function (g) {
  function lum(c) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function ratio(a, b) {
    var L1 = lum(a), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }
  /* sRGB source-over: \`over\` painted on \`under\` at \`alpha\`. This is what a
     CSS overlay actually does — compositing happens in sRGB, NOT in the
     linearised space luminance is computed from, which is exactly why solving
     for alpha in closed form is so easy to get subtly wrong. */
  function composite(over, under, alpha) {
    var m = function (o, u) { return o * alpha + u * (1 - alpha); };
    return { r: m(over.r, under.r), g: m(over.g, under.g), b: m(over.b, under.b) };
  }
  /* Luminance of a STACK of overlays, applied bottom-up, without allocating an
     object per pixel — the hot path when a tool walks half a million pixels per
     frame. \`alphas\` is applied in paint order, so [0.30, 0.12] means the
     baseline goes down first and the per-image top-up over it.

     This is deliberately a LOOP over real composites and not a combined alpha:
     sRGB compositing is not additive in alpha, and the whole point of the
     exercise is to measure the stack exactly as the browser paints it. */
  function stackLum(over, uR, uG, uB, alphas) {
    var r = uR, gg = uG, b = uB;
    for (var i = 0; i < alphas.length; i++) {
      var a = alphas[i], k = 1 - a;
      r = over.r * a + r * k; gg = over.g * a + gg * k; b = over.b * a + b * k;
    }
    return lum({ r: r, g: gg, b: b });
  }
  g.__wcag = { lum: lum, ratio: ratio, composite: composite, stackLum: stackLum };
})(typeof window !== 'undefined' ? window : this);
`;

/* Evaluate the same text here so Node and the page run identical math. */
const scope = {};
new Function(SRC).call(scope);
const { lum, ratio, composite, stackLum } = scope.__wcag;

const WHITE = { r: 255, g: 255, b: 255 };

function hexToRgb(hex) {
  const h = String(hex).replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error('bad hex: ' + hex);
  return { r: parseInt(full.slice(0, 2), 16),
           g: parseInt(full.slice(2, 4), 16),
           b: parseInt(full.slice(4, 6), 16) };
}

module.exports = { lum, ratio, composite, stackLum, hexToRgb, WHITE, SRC };
