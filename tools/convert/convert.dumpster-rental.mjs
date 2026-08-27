/* dumpster-rental was extracted in wave 0 by wave0-build.mjs, not by convert.mjs.
   This config exists so gate.mjs can normalise the ORIGINAL's identity tokens and
   inline literals into canonical names when diffing — one source of truth for the
   mapping, shared by both tools. */
export default {
  scheme: 'dark',

  tokenMap: {
    '--pine-deep': '--ground-deep', '--pine-2': '--panel', '--pine': '--ground',
    '--moss': '--panel-2', '--safety-bright': '--accent-2', '--safety': '--accent',
    '--amber-deep': '--accent-deep', '--sand-soft': '--ink-bright', '--sand': '--ink',
    '--kraft': '--ink-dim', '--muted': '--muted', '--line': '--hair-accent',
    '--hair': '--hair', '--card-brd': '--card-brd', '--card': '--card',
    '--shadow': '--shadow', '--maxw': '--maxw'
  },

  literals: {
    '#161105': '--accent-ink', '#fffdf6': '--sheen-hi', '#d8c9a4': '--sheen-lo',
    '#fff6dd': '--sheen-accent', '#0a1812': '--ground-2', '#08130e': '--ground-deep',
    '#0e1f18': '--ground', '#132a20': '--panel', '#6f6a58': '--placeholder',
    '#e0616b': '--err', '#ff9aa2': '--err-ink', '#fff': '--ink-max',
    'rgba(255,196,0,.14)': '--hair-accent'
  },

  dead: ['--moss'],
  themeColor: '#0e1f18',
  priceRange: '$299-$554'
};
