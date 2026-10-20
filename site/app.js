/* Clear Explorer — plain-language Solana transaction page (redesign concept).
   No build step, no dependencies. Reads mainnet RPC + Jupiter's public token/price API. */
(() => {
'use strict';
const RPCS = ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'];
const SAMPLE = '4tSEapDAbtZTjCbPzKCuEnjnrx9EQiq9Z1TqVdbMCFgWnfJoLKaiYbz1E8Bs1RoxjWUnnHyYLZs8YbddnmyNkBK2';
const WSOL = 'So11111111111111111111111111111111111111112';
const SOL_META = { symbol: 'SOL', name: 'Solana', decimals: 9, icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' };

const PROGRAMS = {
  '11111111111111111111111111111111': 'System Program',
  'ComputeBudget111111111111111111111111111111': 'Compute Budget',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Account',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': 'Jupiter v4',
  'jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu': 'Jupiter Limit Order',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpools',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': 'Raydium CPMM',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora DLMM',
  'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG': 'Meteora DAMM v2',
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB': 'Meteora Pools',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'pump.fun',
  'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA': 'PumpSwap AMM',
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr': 'Memo',
  'Stake11111111111111111111111111111111111111': 'Stake Program',
  'Vote111111111111111111111111111111111111111': 'Vote Program',
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Metaplex Metadata',
  'AddressLookupTab1e1111111111111111111111111': 'Address Lookup Table',
};

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = a => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '';
const isSig = s => /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(s);

function fmt(n, max = 6) {
  const a = Math.abs(n);
  if (a === 0) return '0';
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  const digits = a >= 1000 ? 2 : a >= 1 ? 4 : max;
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
const usd = v => v == null || !isFinite(v) ? '' : v < 0.01 ? '<$0.01' : '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
function ago(ts) {
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 60) return `${Math.floor(s)} sec ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

/* --- base58 decode (for Compute Budget instruction data) --- */
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58decode(str) {
  const bytes = [0];
  for (const ch of str) {
    let carry = B58.indexOf(ch); if (carry < 0) return new Uint8Array();
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of str) { if (ch === '1') bytes.push(0); else break; }
  return new Uint8Array(bytes.reverse());
}
const leU = (b, o, n) => { let v = 0n; for (let i = n - 1; i >= 0; i--) v = (v << 8n) + BigInt(b[o + i] || 0); return v; };

/* --- data --- */
async function rpc(method, params) {
  let last;
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
      const j = await r.json(); if (j.error) throw new Error(j.error.message);
      return j.result;
    } catch (e) { if (!last || /HTTP 403/.test(last.message)) last = e; if (/maxSupportedTransactionVersion/.test(e.message)) throw e; }
  }
  throw last;
}
async function loadTx(sig) {
  try {
    let res;
    try { res = await rpc('getTransaction', [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]); }
    catch (e) { // newer transaction versions: retry with the version the node asks for
      const v = /maxSupportedTransactionVersion\W+(\d+)/.exec(e.message);
      if (!v) throw e;
      res = await rpc('getTransaction', [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: +v[1], commitment: 'confirmed' }]);
    }
    if (res) return res;
  } catch (e) { if (sig !== SAMPLE) throw e; }
  if (sig === SAMPLE) return (await (await fetch('sample-tx.json')).json()).result;
  return null;
}
async function loadTokens(mints) {
  const out = {};
  if (!mints.length) return out;
  try {
    const r = await fetch('https://lite-api.jup.ag/tokens/v2/search?query=' + mints.join(','));
    for (const t of await r.json()) out[t.id] = t;
  } catch (_) { try { Object.assign(out, await (await fetch('sample-tokens.json')).json()); } catch (_) {} }
  return out;
}
async function loadPrices(mints) {
  try { const r = await fetch('https://lite-api.jup.ag/price/v3?ids=' + mints.join(',')); return await r.json(); } catch (_) { return {}; }
}

/* --- analysis: turn raw RPC into "what happened" --- */
function analyse(tx) {
  const msg = tx.transaction.message, meta = tx.meta;
  const keys = msg.accountKeys.map(k => typeof k === 'string' ? { pubkey: k } : k);
  const payer = keys[0].pubkey;
  const fee = meta.fee / 1e9;

  // native SOL per account (fee removed from payer so it is shown separately)
  const sol = {};
  keys.forEach((k, i) => {
    let d = (meta.postBalances[i] - meta.preBalances[i]) / 1e9;
    if (i === 0) d += fee;
    if (Math.abs(d) > 1e-12) sol[k.pubkey] = d;
  });
  // token deltas grouped by owner+mint
  const tok = {}; // owner -> mint -> {delta, decimals}
  const touch = (b, sign) => {
    const owner = b.owner || keys[b.accountIndex].pubkey;
    const o = tok[owner] ||= {};
    const e = o[b.mint] ||= { delta: 0, decimals: b.uiTokenAmount.decimals };
    e.delta += sign * Number(b.uiTokenAmount.amount) / 10 ** b.uiTokenAmount.decimals;
  };
  (meta.preTokenBalances || []).forEach(b => touch(b, -1));
  (meta.postTokenBalances || []).forEach(b => touch(b, +1));

  // per-owner asset changes; wrapped SOL is merged into SOL so people see one "SOL"
  const owners = new Set([...Object.keys(sol), ...Object.keys(tok)]);
  const changes = {};
  for (const o of owners) {
    const m = {};
    if (sol[o]) m[WSOL] = sol[o];
    for (const [mint, e] of Object.entries(tok[o] || {})) if (Math.abs(e.delta) > 1e-12) m[mint] = (m[mint] || 0) + e.delta;
    for (const k of Object.keys(m)) if (Math.abs(m[k]) < 1e-12) delete m[k];
    if (Object.keys(m).length) changes[o] = m;
  }

  const ix = msg.instructions;
  const inner = (meta.innerInstructions || []).flatMap(g => g.instructions);
  const programIds = [...new Set([...ix, ...inner].map(i => i.programId))];
  const mints = [...new Set(Object.values(changes).flatMap(Object.keys))];
  const sigCount = tx.transaction.signatures.length;
  return { tx, msg, meta, keys, payer, fee, baseFee: 5000 * sigCount / 1e9, changes, ix, inner, programIds, mints, logs: meta.logMessages || [] };
}

function friendlyError(a) {
  const logs = a.logs.join('\n');
  if (/SlippageToleranceExceeded|0x1771/.test(logs)) return 'The price moved more than your slippage setting allowed, so the swap was cancelled to protect you.';
  if (/insufficient (funds|lamports)/i.test(logs) || /0x1\b/.test(logs)) return 'The wallet did not have enough balance to complete this.';
  if (/exceeded CUs meter|ComputationalBudgetExceeded/.test(logs)) return 'It ran out of compute budget. Retrying with a higher compute limit usually fixes this.';
  if (/blockhash not found/i.test(logs)) return 'The transaction expired before it was processed.';
  return 'A program rejected the transaction. The technical log below shows which one.';
}

function describe(a, meta) {
  const sym = m => m === WSOL ? 'SOL' : (meta[m]?.symbol || short(m));
  const mine = a.changes[a.payer] || {};
  const outs = Object.entries(mine).filter(([, v]) => v < 0).sort((x, y) => x[1] - y[1]);
  const ins = Object.entries(mine).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
  const dex = a.programIds.map(p => PROGRAMS[p]).find(n => /Jupiter|Orca|Raydium|Meteora|pump|PumpSwap/.test(n || ''));
  const who = `Wallet <span class="mono">${short(a.payer)}</span>`;
  if (a.meta.err) return { kind: 'Failed transaction', html: `This transaction <b>failed</b>. Nothing moved except the network fee.`, sub: friendlyError(a), outs: [], ins: [] };
  // ignore tiny SOL dust from rent when a real token leg exists
  const realOut = outs.filter(([m, v]) => !(m === WSOL && Math.abs(v) < 0.0025 && outs.length > 1));
  const realIn = ins.filter(([m, v]) => !(m === WSOL && Math.abs(v) < 0.0025 && ins.length > 1));
  if (realOut.length && realIn.length) {
    const [om, ov] = realOut[0], [im, iv] = realIn[0];
    return { kind: 'Swap', html: `${who} swapped <span class="amt out">${fmt(-ov)} ${esc(sym(om))}</span> for <span class="amt in">${fmt(iv)} ${esc(sym(im))}</span>${dex ? ` on ${esc(dex)}` : ''}.`, sub: dex ? `${esc(dex)} found the route; the trade settled in one transaction.` : 'Two assets changed hands in one transaction.', outs: realOut, ins: realIn };
  }
  if (realOut.length) {
    const [om, ov] = realOut[0];
    const to = Object.entries(a.changes).find(([o, m]) => o !== a.payer && (m[om] || 0) > 0);
    return { kind: 'Transfer', html: `${who} sent <span class="amt out">${fmt(-ov)} ${esc(sym(om))}</span>${to ? ` to <span class="mono">${short(to[0])}</span>` : ''}.`, sub: 'A direct transfer between wallets.', outs: realOut, ins: to ? [[om, to[1][om]]] : [], toAddr: to?.[0] };
  }
  if (realIn.length) {
    const [im, iv] = realIn[0];
    return { kind: 'Received', html: `${who} received <span class="amt in">${fmt(iv)} ${esc(sym(im))}</span>.`, sub: 'Funds arrived in this wallet.', outs: [], ins: realIn };
  }
  const names = a.programIds.map(p => PROGRAMS[p]).filter(n => n && !/Compute Budget|System Program/.test(n));
  return { kind: 'Program interaction', html: `${who} interacted with ${esc(names[0] || short(a.programIds.at(-1)))}.`, sub: 'No token balances changed for the signer.', outs: [], ins: [] };
}

function stepText(i, a, meta) {
  const name = PROGRAMS[i.programId] || `Program ${short(i.programId)}`;
  const p = i.parsed && typeof i.parsed === 'object' ? i.parsed : null;
  const sym = m => m === WSOL ? 'SOL' : (meta[m]?.symbol || short(m));
  if (i.programId === 'ComputeBudget111111111111111111111111111111' && i.data) {
    const b = b58decode(i.data);
    if (b[0] === 2) return ['Set a compute limit', `Up to ${Number(leU(b, 1, 4)).toLocaleString()} compute units.`];
    if (b[0] === 3) return ['Added a priority fee', `${Number(leU(b, 1, 8)).toLocaleString()} micro-lamports per compute unit, to land faster.`];
    return ['Adjusted compute budget', ''];
  }
  if (p) {
    const inf = p.info || {};
    switch (`${i.program}:${p.type}`) {
      case 'spl-associated-token-account:createIdempotent':
      case 'spl-associated-token-account:create': return ['Made sure a token account exists', `For ${esc(sym(inf.mint))}, owned by ${short(inf.wallet)}. Free if it already existed.`];
      case 'spl-token:closeAccount': return ['Closed a temporary token account', `Its rent deposit went back to ${short(inf.destination)}.`];
      case 'spl-token:transfer': case 'spl-token:transferChecked': return ['Moved tokens', `${inf.tokenAmount ? fmt(inf.tokenAmount.uiAmount) : inf.amount} ${esc(sym(inf.mint || ''))} from ${short(inf.source)} to ${short(inf.destination)}.`];
      case 'spl-token:syncNative': return ['Wrapped SOL', 'Turned SOL into wSOL so a DEX can trade it.'];
      case 'system:transfer': return ['Sent SOL', `${fmt(inf.lamports / 1e9)} SOL from ${short(inf.source)} to ${short(inf.destination)}.`];
      case 'system:createAccount': return ['Created an account', `Funded with ${fmt(inf.lamports / 1e9)} SOL rent.`];
      case 'system:advanceNonce': return ['Used a durable nonce', 'Lets the signer pre-sign now and send later without the transaction expiring.'];
      case 'spl-memo:undefined': return ['Attached a memo', esc(String(p))];
    }
    return [`${name}: ${esc(p.type || 'instruction')}`, ''];
  }
  if (/Jupiter/.test(name)) {
    const venues = [...new Set(a.inner.map(x => PROGRAMS[x.programId]).filter(n => n && !/Token|System|Associated|Compute|Memo/.test(n) && !/Jupiter/.test(n)))];
    return [`Swapped through ${name}`, venues.length ? `Routed via ${venues.map(esc).join(', ')}.` : 'Best route picked automatically.'];
  }
  return [`Called ${esc(name)}`, ''];
}

function tokenWarnings(a, meta) {
  const out = [];
  for (const m of a.mints) {
    const t = meta[m]; if (!t || m === WSOL) continue;
    const ageH = t.createdAt ? (Date.now() - Date.parse(t.createdAt)) / 36e5 : null;
    const bits = [];
    if (ageH != null && ageH < 24 * 7) bits.push(`created ${ageH < 48 ? Math.round(ageH) + ' hours' : Math.round(ageH / 24) + ' days'} ago`);
    if (t.launchpad) bits.push(`launched on ${esc(t.launchpad)}`);
    if (t.organicScoreLabel === 'low') bits.push('low organic trading');
    if (t.audit && t.audit.mintAuthorityDisabled === false) bits.push('the creator can still mint more');
    if ((t.tags || []).includes('unknown') && bits.length) out.push(`<b>${esc(t.symbol)}</b> is an unverified token — ${bits.join(', ')}. New tokens are high-risk; double-check before buying.`);
  }
  return out;
}

/* --- render --- */
function tokBox(label, [mint, amt], meta, prices) {
  const t = mint === WSOL ? SOL_META : (meta[mint] || { symbol: short(mint) });
  const price = prices[mint]?.usdPrice ?? (mint === WSOL ? prices[WSOL]?.usdPrice : meta[mint]?.usdPrice);
  const icon = t.icon ? `<img src="${esc(t.icon)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:'${esc((t.symbol || '?')[0])}'}))">` : `<div class="ph">${esc((t.symbol || '?')[0])}</div>`;
  return `<div class="tok">${icon}<div><div class="lab">${label}</div><div class="val">${fmt(Math.abs(amt))} ${esc(t.symbol)}</div><div class="usd">${price ? '≈ ' + usd(Math.abs(amt) * price) + ' at today’s price' : '&nbsp;'}</div></div></div>`;
}

function nameFor(addr, a, meta) {
  if (PROGRAMS[addr]) return PROGRAMS[addr];
  if (addr === a.payer) return 'Signer (fee payer)';
  for (const t of Object.values(meta)) if (t.graduatedPool === addr) return `${t.symbol}/SOL pool`;
  return 'Account';
}

function render(sig, a, meta, prices) {
  const d = describe(a, meta);
  const solUsd = prices[WSOL]?.usdPrice;
  const priority = Math.max(0, a.fee - a.baseFee);
  const when = a.tx.blockTime ? new Date(a.tx.blockTime * 1000) : null;
  const sym = m => m === WSOL ? 'SOL' : (meta[m]?.symbol || short(m));
  const warns = tokenWarnings(a, meta);

  const flow = d.outs.length || d.ins.length ? `<div class="flow">${d.outs[0] ? tokBox(d.kind === 'Swap' ? 'Paid' : 'Sent', d.outs[0], meta, prices) : '<div></div>'}<div class="arrow" aria-hidden="true">→</div>${d.ins[0] ? tokBox(d.kind === 'Swap' ? 'Got' : 'Received', d.ins[0], meta, prices) : '<div></div>'}</div>` : '';

  const balRows = Object.entries(a.changes).sort(([x], [y]) => (y === a.payer) - (x === a.payer)).map(([owner, m]) => {
    const isPayer = owner === a.payer;
    const deltas = Object.entries(m).map(([mint, v]) => `<div class="${v > 0 ? 'pos' : 'neg'}">${v > 0 ? '+' : '−'}${fmt(Math.abs(v))} ${esc(sym(mint))}</div>`).join('');
    return `<div class="row"><div class="who"><div><div class="name">${esc(nameFor(owner, a, meta))} ${isPayer ? '<span class="chip you">signed this</span>' : ''}</div><div class="addr">${esc(owner)}</div></div></div><div class="deltas">${deltas}</div></div>`;
  }).join('') || '<div class="row muted">No balances changed.</div>';

  const steps = a.ix.map((i, n) => { const [t, s] = stepText(i, a, meta); return `<li><span class="n">${n + 1}</span><div class="t"><b>${t}</b>${s ? `<div>${s}</div>` : ''}</div></li>`; }).join('');

  const kv = [
    ['Signature', `<span class="mono">${esc(sig)}</span><button class="copy" data-copy="${esc(sig)}">Copy</button>`],
    ['Result', a.meta.err ? `Failed — <span class="mono">${esc(JSON.stringify(a.meta.err))}</span>` : 'Success'],
    ['Block (slot)', a.tx.slot.toLocaleString()],
    ['Time (UTC)', when ? when.toISOString().replace('T', ' ').slice(0, 19) : '—'],
    ['Fee', `${a.fee} SOL = ${a.baseFee} base + ${+priority.toFixed(9)} priority`],
    ['Compute used', a.meta.computeUnitsConsumed?.toLocaleString() ?? '—'],
    ['Version', String(a.tx.version ?? 'legacy')],
    ['Recent blockhash', `<span class="mono">${esc(a.msg.recentBlockhash)}</span>`],
  ].map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');

  const accts = a.keys.map((k, i) => `<div class="k">#${i + 1} ${esc(PROGRAMS[k.pubkey] || '')} ${k.signer ? '<span class="chip you">signer</span>' : ''} ${k.writable ? '<span class="chip">writable</span>' : ''} ${k.source === 'lookupTable' ? '<span class="chip">lookup table</span>' : ''}</div><div class="v mono">${esc(k.pubkey)}</div>`).join('');

  $('#app').innerHTML = `
  <section class="hero">
    <span class="status ${a.meta.err ? 'fail' : 'ok'}"><span class="dot"></span>${a.meta.err ? 'Failed' : 'Success'}</span><span class="kind">${esc(d.kind)}${when ? ' · ' + ago(a.tx.blockTime) : ''}</span>
    <h1 class="headline">${d.html}</h1>
    <p class="sub">${d.sub}</p>
    ${flow}
    <div class="facts">
      <div class="fact"><div class="k">Network fee</div><div class="v">${fmt(a.fee, 9)} SOL</div><div class="k">${solUsd ? usd(a.fee * solUsd) : ''}</div></div>
      <div class="fact"><div class="k">When</div><div class="v">${when ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div><div class="k">${when ? when.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : ''} (your time)</div></div>
      <div class="fact"><div class="k">Finality</div><div class="v">${a.meta.err ? 'Recorded' : 'Final'}</div><div class="k">cannot be reversed</div></div>
      <div class="fact"><div class="k">Steps</div><div class="v">${a.ix.length} instructions</div><div class="k">${a.programIds.length} programs</div></div>
    </div>
    ${warns.map(w => `<div class="warn">⚠️<div>${w}</div></div>`).join('')}
  </section>

  <section class="card"><h2>Who gained and who paid <small>net change per wallet</small></h2>${balRows}</section>
  <section class="card"><h2>Step by step <small>what each instruction did</small></h2><ol class="steps">${steps}</ol></section>

  <details class="tech" id="tech"><summary>Technical details</summary><div class="kv">${kv}</div></details>
  <details class="tech"><summary>All ${a.keys.length} accounts</summary><div class="kv">${accts}</div></details>
  <details class="tech"><summary>Program logs (${a.logs.length} lines)</summary><pre class="logs">${esc(a.logs.join('\n'))}</pre></details>`;
  document.title = `${d.kind}: ${$('.headline').textContent} — Clear Explorer`;
}

function toast(t) { const el = Object.assign(document.createElement('div'), { className: 'toast', textContent: t }); document.body.append(el); setTimeout(() => el.remove(), 1600); }
async function copy(t) { try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (_) { toast('Copy failed'); } }

async function show(sig) {
  $('#app').innerHTML = $('#loading')?.outerHTML || '<section class="skeleton"><div class="sk sk-title"></div><div class="sk sk-card"></div></section>';
  $('#q').value = sig === SAMPLE ? '' : sig;
  if (!isSig(sig)) {
    $('#app').innerHTML = `<div class="err"><h2>That doesn't look like a transaction signature</h2><p class="muted">A signature is 87–88 characters of letters and numbers (no 0, O, I or l). Wallet addresses are shorter, around 44 characters — try your wallet's activity tab and tap a transaction to copy its signature.</p></div>`;
    return;
  }
  try {
    const tx = await loadTx(sig);
    if (!tx) { $('#app').innerHTML = `<div class="err"><h2>Not found yet</h2><p class="muted">The network hasn't confirmed this signature. If you just sent it, wait a few seconds and refresh. If it's older than ~2 minutes and still missing, it probably expired and no funds moved.</p></div>`; return; }
    const a = analyse(tx);
    const mints = a.mints.filter(m => m !== WSOL);
    const [meta, prices] = await Promise.all([loadTokens(mints), loadPrices([WSOL, ...mints])]);
    render(sig, a, meta, prices);
  } catch (e) {
    $('#app').innerHTML = `<div class="err"><h2>Couldn't reach the network</h2><p class="muted">${esc(e.message)}. The public RPC is rate-limited — try again in a moment.</p></div>`;
  }
}

document.addEventListener('click', e => {
  const c = e.target.closest('[data-copy]'); if (c) copy(c.dataset.copy);
  const b = e.target.closest('[data-act]'); if (!b) return;
  const sig = new URLSearchParams(location.search).get('tx') || SAMPLE;
  if (b.dataset.act === 'copy') copy(sig);
  if (b.dataset.act === 'share') navigator.share ? navigator.share({ title: document.title, url: location.href }).catch(() => {}) : copy(location.href);
  if (b.dataset.act === 'tech') { const t = $('#tech'); if (t) { t.open = true; t.scrollIntoView({ behavior: 'smooth' }); } }
});
$('#search').addEventListener('submit', e => { e.preventDefault(); const s = $('#q').value.trim(); history.pushState(null, '', '?tx=' + encodeURIComponent(s)); show(s); });
$('#toggleCompare').addEventListener('click', () => { const c = $('#compare'); c.hidden = !c.hidden; if (!c.hidden) c.scrollIntoView({ behavior: 'smooth' }); });
window.addEventListener('popstate', () => show(new URLSearchParams(location.search).get('tx') || SAMPLE));

// expose pure functions for tests (node)
if (typeof module !== 'undefined') module.exports = { analyse, describe, b58decode };
show(new URLSearchParams(location.search).get('tx') || SAMPLE);
})();
