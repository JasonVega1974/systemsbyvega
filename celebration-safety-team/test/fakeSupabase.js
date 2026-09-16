/* An in-memory stand-in for supabase-js's query builder, just capable enough
   for what index.html actually calls: .from(table).select/insert/update/
   delete/upsert, .eq/.neq/.in filters, .order/.limit, .single/.maybeSingle.
   No RLS, no real network — that boundary is the SQL migration's job, not
   this harness's. This exists so the app's CRUD functions (saveMember,
   setAssign, toggleOnboard, adminResetEveryone, ...) can be exercised for
   real, including their error-handling paths, without touching the network.

   Each table is a plain array of row objects. Every FakeQuery is a
   "thenable" (has .then, not a real Promise) — deliberately, since that is
   exactly the real supabase-js shape the app's own dbWrite() comment warns
   about (`Promise.resolve(thenable)` is required to make .catch work). A
   fake that behaved like a real Promise would hide a bug class this suite is
   supposed to catch. */

let uuidCounter = 0;
function fakeUuid() { return 'fake-' + (++uuidCounter); }

class FakeQuery {
  constructor(store, table) {
    this.store = store;
    this.table = table;
    this.op = 'select';
    this.payload = null;
    this.upsertOpts = null;
    this.filters = [];
    this.orderCol = null;
    this.orderAsc = true;
    this.limitN = null;
    this.wantSingle = false;
    this.wantMaybeSingle = false;
    this.returnRows = false;
    /* Forced failure injection for error-path tests: sb.__forceError(table, op) */
    this.forcedError = null;
  }
  select() { if (this.op !== 'select') this.returnRows = true; return this; }
  insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(patch) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  upsert(row, opts) { this.op = 'upsert'; this.payload = row; this.upsertOpts = opts || {}; return this; }
  eq(col, val) { this.filters.push({ type: 'eq', col, val }); return this; }
  neq(col, val) { this.filters.push({ type: 'neq', col, val }); return this; }
  in(col, vals) { this.filters.push({ type: 'in', col, vals }); return this; }
  order(col, opts) { this.orderCol = col; this.orderAsc = !(opts && opts.ascending === false); return this; }
  limit(n) { this.limitN = n; return this; }
  single() { this.wantSingle = true; return this; }
  maybeSingle() { this.wantMaybeSingle = true; return this; }

  _matches(row) {
    return this.filters.every(f => {
      if (f.type === 'eq') return row[f.col] === f.val;
      if (f.type === 'neq') return row[f.col] !== f.val;
      if (f.type === 'in') return f.vals.includes(row[f.col]);
      return true;
    });
  }
  _rows() { return this.store[this.table]; }
  _finish(data) {
    if (this.wantSingle) {
      if (!data || data.length !== 1) return { data: null, error: { message: 'Results contain 0 rows, expected 1' } };
      return { data: data[0], error: null };
    }
    if (this.wantMaybeSingle) {
      if (!data || data.length === 0) return { data: null, error: null };
      if (data.length > 1) return { data: null, error: { message: 'multiple (or no) rows returned' } };
      return { data: data[0], error: null };
    }
    return { data, error: null };
  }
  then(resolve, reject) {
    try {
      if (this.forcedError) { resolve({ data: null, error: this.forcedError }); return; }
      let result;
      if (this.op === 'select') {
        let rows = this._rows().filter(r => this._matches(r));
        if (this.orderCol) {
          const col = this.orderCol, asc = this.orderAsc;
          rows = rows.slice().sort((a, b) => {
            const av = a[col], bv = b[col];
            return (av < bv ? -1 : av > bv ? 1 : 0) * (asc ? 1 : -1);
          });
        }
        if (this.limitN != null) rows = rows.slice(0, this.limitN);
        result = this._finish(rows.map(r => Object.assign({}, r)));
      } else if (this.op === 'insert') {
        const inserted = this.payload.map(r => {
          const row = Object.assign({ id: r.id || fakeUuid() }, r);
          this._rows().push(row);
          return Object.assign({}, row);
        });
        result = (this.returnRows || this.wantSingle || this.wantMaybeSingle)
          ? this._finish(inserted) : { data: null, error: null };
      } else if (this.op === 'update') {
        const touched = [];
        this._rows().forEach(r => { if (this._matches(r)) { Object.assign(r, this.payload); touched.push(Object.assign({}, r)); } });
        result = (this.returnRows || this.wantSingle || this.wantMaybeSingle)
          ? this._finish(touched) : { data: null, error: null };
      } else if (this.op === 'delete') {
        const kept = [], removed = [];
        this._rows().forEach(r => (this._matches(r) ? removed : kept).push(r));
        this.store[this.table] = kept;
        result = this.returnRows ? this._finish(removed.map(r => Object.assign({}, r))) : { data: null, error: null };
      } else if (this.op === 'upsert') {
        const conflictCols = (this.upsertOpts.onConflict || '').split(',').map(s => s.trim()).filter(Boolean);
        const rows = this._rows();
        const existing = conflictCols.length ? rows.find(r => conflictCols.every(c => r[c] === this.payload[c])) : null;
        let row;
        if (existing) { Object.assign(existing, this.payload); row = existing; }
        else { row = Object.assign({ id: fakeUuid() }, this.payload); rows.push(row); }
        result = this._finish([Object.assign({}, row)]);
      }
      resolve(result);
    } catch (e) { reject(e); }
  }
}

/* seedTables: { cc_team: [...], cc_leaders: [...], ... } — each array is
   copied, never held by reference, so a test's own fixture object is never
   mutated by the app code under test. */
function createFakeSupabase(seedTables) {
  const store = {};
  Object.keys(seedTables || {}).forEach(k => { store[k] = (seedTables[k] || []).map(r => Object.assign({}, r)); });
  return {
    _store: store,
    from(table) {
      if (!store[table]) store[table] = [];
      return new FakeQuery(store, table);
    },
    /* Test-only escape hatch: makes the NEXT query against `table` resolve
       with `{data:null, error}` instead of touching the store, so a test can
       assert what dbWrite() does when Supabase itself fails. One-shot. */
    __forceNextError(table, error) {
      const realFrom = this.from.bind(this);
      this.from = (t) => {
        this.from = realFrom;
        const q = realFrom(t);
        if (t === table) q.forcedError = error || { message: 'forced failure' };
        return q;
      };
    }
  };
}

module.exports = { createFakeSupabase, fakeUuid };
