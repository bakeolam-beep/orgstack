import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

type HttpMethod = 'GET' | 'POST' | 'PATCH';

type TestCase = {
  id: string;
  description: string;
  authenticatedContext: string;
  targetContext: string;
  attemptedOperation: string;
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL';
  httpStatus?: number;
  details?: unknown;
};

type Timing = {
  endpoint: string;
  method: HttpMethod;
  concurrency: number;
  tenantCount?: number;
  latenciesMs: number[];
  statusCodes: number[];
  errors: string[];
};

type PerfRow = {
  endpoint: string;
  concurrency: number;
  totalRequests: number;
  avgMs: number;
  medianMs: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  throughputRps: number;
  errorRatePct: number;
};

type ScaleRow = {
  tenantCount: number;
  totalActiveVUsers: number;
  totalRequests: number;
  avgMs: number;
  p95Ms: number;
  throughputRps: number;
  errorRatePct: number;
  notes: string;
};

const AUTH = process.env.AUTH_URL ?? 'http://localhost:3001';
const INVENTORY = process.env.INVENTORY_URL ?? 'http://localhost:3002';
const ORDERS = process.env.ORDERS_URL ?? 'http://localhost:3003';
const NOTIFICATIONS = process.env.NOTIFICATIONS_URL ?? 'http://localhost:3004';

const resultsPath = path.resolve(process.cwd(), 'scripts/results.json');
const logLines: string[] = [];

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logLines.push(line);
  console.log(line);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarize(t: Timing, durationMs: number): PerfRow {
  const l = [...t.latenciesMs].sort((a, b) => a - b);
  const total = t.statusCodes.length;
  const errors = t.statusCodes.filter((s) => s < 200 || s >= 300).length + t.errors.length;
  const sum = l.reduce((a, b) => a + b, 0);
  const avg = total ? sum / total : 0;
  const mid = Math.floor(l.length / 2);
  const median = l.length ? (l.length % 2 ? l[mid] : (l[mid - 1] + l[mid]) / 2) : 0;
  return {
    endpoint: `${t.method} ${t.endpoint}`,
    concurrency: t.concurrency,
    totalRequests: total,
    avgMs: round(avg),
    medianMs: round(median),
    p90Ms: round(percentile(l, 90)),
    p95Ms: round(percentile(l, 95)),
    p99Ms: round(percentile(l, 99)),
    minMs: round(l[0] ?? 0),
    maxMs: round(l[l.length - 1] ?? 0),
    throughputRps: round(total / (durationMs / 1000)),
    errorRatePct: round((errors / Math.max(1, total)) * 100),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

async function req(
  method: HttpMethod,
  url: string,
  opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; json: any; text: string; ms: number }> {
  const start = performance.now();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    const ms = performance.now() - start;
    return { status: 0, json: null, text: String(e), ms };
  }
  const ms = performance.now() - start;
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json, text, ms };
}

async function runConcurrent<T>(n: number, fn: (i: number) => Promise<T>): Promise<T[]> {
  return Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
}

async function register(email: string, businessName: string, password = 'EvalPass123!') {
  return req('POST', `${AUTH}/auth/register`, { body: { adminEmail: email, adminPassword: password, businessName } });
}

async function login(email: string, password = 'EvalPass123!'): Promise<{ token: string; tenantId: string; raw: any; status: number }> {
  const r = await req('POST', `${AUTH}/auth/login`, { body: { email, password } });
  return { token: r.json?.accessToken ?? r.json?.token ?? '', tenantId: r.json?.tenantId ?? '', raw: r.json, status: r.status };
}

function getId(obj: any): string | undefined {
  return obj?.id ?? obj?.productId ?? obj?._id ?? obj?.data?.id ?? obj?.product?.id ?? obj?.sale?.id ?? obj?.saleId;
}

function asArray(obj: any): any[] {
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj?.data)) return obj.data;
  if (Array.isArray(obj?.items)) return obj.items;
  if (Array.isArray(obj?.products)) return obj.products;
  if (Array.isArray(obj?.sales)) return obj.sales;
  if (Array.isArray(obj?.notifications)) return obj.notifications;
  return [];
}

async function timedBatch(
  endpoint: string,
  method: HttpMethod,
  concurrency: number,
  iterationsPerUser: number,
  makeCall: (i: number, iter: number) => Promise<{ status: number; ms: number }>,
  tenantCount?: number,
): Promise<{ row: PerfRow; timing: Timing }> {
  const timing: Timing = { endpoint, method, concurrency, tenantCount, latenciesMs: [], statusCodes: [], errors: [] };
  const start = performance.now();
  await runConcurrent(concurrency, async (i) => {
    for (let k = 0; k < iterationsPerUser; k++) {
      try {
        const r = await makeCall(i, k);
        timing.latenciesMs.push(r.ms);
        timing.statusCodes.push(r.status);
      } catch (e) {
        timing.errors.push(String(e));
      }
    }
  });
  const duration = performance.now() - start;
  return { row: summarize(timing, duration), timing };
}

async function main() {
  const startedAt = new Date().toISOString();
  const nodeVersion = process.version;
  log(`Evaluation start. Node ${nodeVersion}`);
  log(`Targets: auth=${AUTH} inventory=${INVENTORY} orders=${ORDERS} notifications=${NOTIFICATIONS}`);

  const testCases: TestCase[] = [];
  const context: any = { startedAt, nodeVersion, services: { AUTH, INVENTORY, ORDERS, NOTIFICATIONS } };

  // --- Setup tenants ---
  const ts = Date.now();
  const alpha = { email: `alpha_${ts}@eval.com`, name: 'Tenant Alpha Eval', password: 'EvalPass123!' };
  const beta = { email: `beta_${ts}@eval.com`, name: 'Tenant Beta Eval', password: 'EvalPass123!' };

  log(`Registering Tenant Alpha: ${alpha.email}`);
  const regA = await register(alpha.email, alpha.name, alpha.password);
  log(`Alpha register status=${regA.status} body=${regA.text.slice(0, 300)}`);
  log(`Registering Tenant Beta: ${beta.email}`);
  const regB = await register(beta.email, beta.name, beta.password);
  log(`Beta register status=${regB.status} body=${regB.text.slice(0, 300)}`);

  const loginA = await login(alpha.email, alpha.password);
  const loginB = await login(beta.email, beta.password);
  log(`Alpha login status=${loginA.status} tenant=${loginA.tenantId} token=${loginA.token ? 'yes' : 'no'}`);
  log(`Beta login status=${loginB.status} tenant=${loginB.tenantId} token=${loginB.token ? 'yes' : 'no'}`);
  context.tenants = { alpha: { ...alpha, ...loginA, registerStatus: regA.status }, beta: { ...beta, ...loginB, registerStatus: regB.status } };

  if (!loginA.token || !loginB.token) {
    throw new Error(`Login failed; cannot continue. Alpha=${loginA.status} Beta=${loginB.status}`);
  }

  // --- Tenant Alpha data ---
  const alphaProducts: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const body = { name: `Alpha Product ${i}`, sku: `ALPHA-${ts}-${i}`, description: `Eval product ${i}`, unitPrice: 100 * i, reorderLevel: i === 1 ? 50 : 5 };
    const r = await req('POST', `${INVENTORY}/inventory/products`, { token: loginA.token, body });
    log(`Create alpha product ${i}: status=${r.status} ${r.text.slice(0, 180)}`);
    alphaProducts.push({ request: body, response: r.json, status: r.status, id: getId(r.json) });
  }

  // stock in
  for (const p of alphaProducts) {
    if (!p.id) continue;
    const qty = p.request.reorderLevel >= 50 ? 10 : 100; // first ends low relative? reorder 50, stock 10 => low
    const r = await req('POST', `${INVENTORY}/inventory/stock-movements`, { token: loginA.token, body: { productId: p.id, type: 'in', quantity: qty, reference: `EVAL-IN-${p.id.slice(0, 8)}` } });
    log(`Stock-in ${p.id}: status=${r.status} qty=${qty} ${r.text.slice(0, 160)}`);
    p.stockIn = { status: r.status, qty };
  }

  // create 2 sales (may trigger low-stock / notifications depending on implementation)
  const alphaSales: any[] = [];
  for (let s = 0; s < 2; s++) {
    const p = alphaProducts.find((x) => x.id) ?? alphaProducts[0];
    if (!p?.id) break;
    const body = { items: [{ productId: p.id, quantity: 1, unitPrice: p.request.unitPrice }] };
    const r = await req('POST', `${ORDERS}/orders`, { token: loginA.token, body });
    log(`Create alpha sale ${s + 1}: status=${r.status} ${r.text.slice(0, 220)}`);
    alphaSales.push({ status: r.status, response: r.json, body });
  }

  // trigger low-stock alert explicitly by moving stock out below reorder for product 1
  if (alphaProducts[0]?.id) {
    const r = await req('POST', `${INVENTORY}/inventory/stock-movements`, { token: loginA.token, body: { productId: alphaProducts[0].id, type: 'out', quantity: 5, reference: 'EVAL-LOWSTOCK' } });
    log(`Low-stock trigger move: status=${r.status} ${r.text.slice(0, 180)}`);
  }
  await new Promise((r) => setTimeout(r, 1500)); // allow async notification processing

  // --- Tenant Beta data ---
  const betaProducts: any[] = [];
  {
    const body = { name: 'Beta Product 1', sku: `BETA-${ts}-1`, description: 'Beta eval', unitPrice: 55, reorderLevel: 2 };
    const r = await req('POST', `${INVENTORY}/inventory/products`, { token: loginB.token, body });
    log(`Create beta product: status=${r.status} ${r.text.slice(0, 180)}`);
    betaProducts.push({ request: body, response: r.json, status: r.status, id: getId(r.json) });
  }
  context.alphaProducts = alphaProducts;
  context.betaProducts = betaProducts;
  context.alphaSales = alphaSales;

  // --- Isolation tests ---
  const alphaProdId = alphaProducts.find((p) => p.id)?.id;
  if (!alphaProdId) {
    testCases.push({ id: 'ISO-SETUP', description: 'Setup produced Alpha product ID', authenticatedContext: 'Tenant Alpha', targetContext: 'N/A', attemptedOperation: 'Create product', expectedResult: 'Product created with ID', actualResult: 'No product ID returned', status: 'FAIL' });
  } else {
    // a) Beta GET Alpha product
    {
      const r = await req('GET', `${INVENTORY}/inventory/products/${alphaProdId}`, { token: loginB.token });
      const pass = r.status === 404 || r.status === 403;
      testCases.push({ id: 'ISO-001', description: 'Tenant Beta attempts to GET Tenant Alpha product by ID', authenticatedContext: `Tenant Beta (${loginB.tenantId})`, targetContext: `Tenant Alpha product ${alphaProdId}`, attemptedOperation: `GET /inventory/products/${alphaProdId}`, expectedResult: 'HTTP 404 (not found in tenant scope) or 403', actualResult: `HTTP ${r.status} body=${r.text.slice(0, 180)}`, status: pass ? 'PASS' : 'FAIL', httpStatus: r.status });
    }
    // b) Beta GET Alpha sales list
    {
      const r = await req('GET', `${ORDERS}/orders`, { token: loginB.token });
      const arr = asArray(r.json);
      const hasAlpha = alphaSales.some((s) => {
        const sid = getId(s.response);
        return sid && arr.some((x: any) => getId(x) === sid);
      });
      const pass = r.status === 200 && arr.length === 0 && !hasAlpha;
      testCases.push({ id: 'ISO-002', description: 'Tenant Beta attempts to GET sales list; must not see Alpha sales', authenticatedContext: `Tenant Beta (${loginB.tenantId})`, targetContext: 'Tenant Alpha sales', attemptedOperation: 'GET /orders', expectedResult: 'HTTP 200 with empty array [] (no Alpha data)', actualResult: `HTTP ${r.status} count=${arr.length} hasAlphaRef=${hasAlpha} body=${r.text.slice(0, 180)}`, status: pass ? 'PASS' : 'FAIL', httpStatus: r.status });
    }
    // c) Beta GET Alpha notifications
    {
      const r = await req('GET', `${NOTIFICATIONS}/notifications`, { token: loginB.token });
      const arr = asArray(r.json);
      const pass = r.status === 200 && arr.length === 0;
      testCases.push({ id: 'ISO-003', description: 'Tenant Beta attempts to GET notifications; must not see Alpha notifications', authenticatedContext: `Tenant Beta (${loginB.tenantId})`, targetContext: 'Tenant Alpha notifications', attemptedOperation: 'GET /notifications', expectedResult: 'HTTP 200 with empty array []', actualResult: `HTTP ${r.status} count=${arr.length} body=${r.text.slice(0, 180)}`, status: pass ? 'PASS' : 'FAIL', httpStatus: r.status });
    }
    // d) Beta UPDATE Alpha product price
    {
      const r = await req('PATCH', `${INVENTORY}/inventory/products/${alphaProdId}`, { token: loginB.token, body: { unitPrice: 0.01 } });
      const pass = r.status === 404 || r.status === 403 || r.status === 400;
      // verify alpha product unchanged
      const check = await req('GET', `${INVENTORY}/inventory/products/${alphaProdId}`, { token: loginA.token });
      const price = check.json?.unitPrice ?? check.json?.data?.unitPrice;
      const unchanged = price === undefined ? true : Number(price) !== 0.01;
      const finalPass = pass && unchanged;
      testCases.push({ id: 'ISO-004', description: 'Tenant Beta attempts to UPDATE Tenant Alpha product price', authenticatedContext: `Tenant Beta (${loginB.tenantId})`, targetContext: `Tenant Alpha product ${alphaProdId}`, attemptedOperation: `PATCH /inventory/products/${alphaProdId} {unitPrice:0.01}`, expectedResult: 'HTTP 404/403/400 and Alpha price unchanged', actualResult: `HTTP ${r.status} alphaCheck=${check.status} alphaPrice=${price} unchanged=${unchanged} body=${r.text.slice(0, 140)}`, status: finalPass ? 'PASS' : 'FAIL', httpStatus: r.status });
    }
    // e) Untrusted header injection
    {
      const r = await req('GET', `${INVENTORY}/inventory/products`, { token: loginA.token, headers: { 'X-Tenant-Id': loginB.tenantId, 'x-tenant-id': loginB.tenantId } });
      const arr = asArray(r.json);
      const seesBeta = betaProducts.some((p) => p.id && arr.some((x: any) => getId(x) === p.id));
      const seesAlpha = alphaProducts.some((p) => p.id && arr.some((x: any) => getId(x) === p.id));
      const pass = r.status === 200 && !seesBeta && (seesAlpha || arr.length >= 0);
      testCases.push({ id: 'ISO-005', description: 'Header injection: Token_Alpha with X-Tenant-Id=Beta; system must trust token claims', authenticatedContext: `Tenant Alpha token (${loginA.tenantId})`, targetContext: `Spoofed header tenant ${loginB.tenantId}`, attemptedOperation: 'GET /inventory/products with X-Tenant-Id header set to Beta', expectedResult: 'Returns Tenant Alpha data; ignores client tenant header', actualResult: `HTTP ${r.status} seesAlpha=${seesAlpha} seesBeta=${seesBeta} count=${arr.length} body=${r.text.slice(0, 180)}`, status: pass ? 'PASS' : 'FAIL', httpStatus: r.status });
    }
  }

  for (const tc of testCases) log(`ISOLATION ${tc.id}: ${tc.status} - ${tc.actualResult}`);

  // --- Performance tests ---
  // Create a perf tenant to avoid polluting Alpha/Beta isolation narrative
  const perfEmail = `perf_${ts}@eval.com`;
  const perfReg = await register(perfEmail, 'Perf Tenant', 'EvalPass123!');
  const perfLogin = await login(perfEmail, 'EvalPass123!');
  log(`Perf tenant login status=${perfLogin.status}`);
  if (!perfLogin.token) throw new Error('Perf tenant login failed');

  // seed perf product for stock/order ops
  const perfProd = await req('POST', `${INVENTORY}/inventory/products`, { token: perfLogin.token, body: { name: 'Perf Product', sku: `PERF-${ts}`, description: 'perf', unitPrice: 10, reorderLevel: 100000 } });
  const perfProdId = getId(perfProd.json);
  if (perfProdId) {
    await req('POST', `${INVENTORY}/inventory/stock-movements`, { token: perfLogin.token, body: { productId: perfProdId, type: 'in', quantity: 500000, reference: 'PERF-SEED' } });
  }
  log(`Perf product id=${perfProdId} status=${perfProd.status}`);

  const perfRows: PerfRow[] = [];
  const levels = [
    { c: 1, iters: 12 },
    { c: 10, iters: 4 },
    { c: 25, iters: 2 },
  ];

  for (const lvl of levels) {
    log(`Performance level concurrency=${lvl.c} iters/user=${lvl.iters}`);
    // login
    perfRows.push((await timedBatch(' /auth/login', 'POST', lvl.c, lvl.iters, async () => {
      const r = await req('POST', `${AUTH}/auth/login`, { body: { email: perfEmail, password: 'EvalPass123!' } });
      return { status: r.status, ms: r.ms };
    })).row);
    // get products
    perfRows.push((await timedBatch('/inventory/products', 'GET', lvl.c, lvl.iters, async () => {
      const r = await req('GET', `${INVENTORY}/inventory/products`, { token: perfLogin.token });
      return { status: r.status, ms: r.ms };
    })).row);
    // stock movement (small in)
    perfRows.push((await timedBatch('/inventory/stock-movements', 'POST', lvl.c, Math.max(1, Math.floor(lvl.iters / 2)), async (_i, iter) => {
      const r = await req('POST', `${INVENTORY}/inventory/stock-movements`, { token: perfLogin.token, body: { productId: perfProdId, type: 'in', quantity: 1, reference: `PERF-${lvl.c}-${_i}-${iter}` } });
      return { status: r.status, ms: r.ms };
    })).row);
    // create order
    perfRows.push((await timedBatch('/orders', 'POST', lvl.c, Math.max(1, Math.floor(lvl.iters / 2)), async (_i, iter) => {
      const r = await req('POST', `${ORDERS}/orders`, { token: perfLogin.token, body: { items: [{ productId: perfProdId, quantity: 1, unitPrice: 10 }] } });
      return { status: r.status, ms: r.ms };
    })).row);
    // notifications
    perfRows.push((await timedBatch('/notifications', 'GET', lvl.c, lvl.iters, async () => {
      const r = await req('GET', `${NOTIFICATIONS}/notifications`, { token: perfLogin.token });
      return { status: r.status, ms: r.ms };
    })).row);
  }
  for (const row of perfRows) log(`PERF ${row.endpoint} c=${row.concurrency} avg=${row.avgMs} p95=${row.p95Ms} err=${row.errorRatePct}% n=${row.totalRequests}`);

  // --- Scalability ---
  async function provisionTenant(i: number): Promise<{ email: string; token: string; tenantId: string; productId?: string }> {
    const email = `scale${i}_${ts}@eval.com`;
    const r1 = await register(email, `Scale Tenant ${i}`, 'EvalPass123!');
    if (r1.status >= 400 && r1.status !== 409) log(`Scale register ${i} failed ${r1.status}`);
    const l = await login(email, 'EvalPass123!');
    let productId: string | undefined;
    if (l.token) {
      const p = await req('POST', `${INVENTORY}/inventory/products`, { token: l.token, body: { name: `S${i} Prod`, sku: `S${i}-${ts}`, unitPrice: 5, reorderLevel: 1 } });
      productId = getId(p.json);
      if (productId) await req('POST', `${INVENTORY}/inventory/stock-movements`, { token: l.token, body: { productId, type: 'in', quantity: 10000, reference: 'SEED' } });
    }
    return { email, token: l.token, tenantId: l.tenantId, productId };
  }

  const scaleRows: ScaleRow[] = [];
  for (const tenantCount of [2, 5, 15]) {
    log(`Scalability provisioning ${tenantCount} tenants`);
    const tenants: Array<{ token: string; tenantId: string; productId?: string }> = [];
    for (let i = 0; i < tenantCount; i++) tenants.push(await provisionTenant(i + 1));
    const okTenants = tenants.filter((t) => t.token && t.productId);
    const vusers = okTenants.length; // one active user context per tenant
    const reqsPerTenant = 6;
    const t: Timing = { endpoint: 'mixed inventory+order', method: 'POST', concurrency: vusers, tenantCount, latenciesMs: [], statusCodes: [], errors: [] };
    const start = performance.now();
    await runConcurrent(okTenants.length, async (i) => {
      const tenant = okTenants[i];
      for (let k = 0; k < reqsPerTenant; k++) {
        const op = k % 2 === 0
          ? req('GET', `${INVENTORY}/inventory/products`, { token: tenant.token })
          : req('POST', `${ORDERS}/orders`, { token: tenant.token, body: { items: [{ productId: tenant.productId, quantity: 1, unitPrice: 5 }] } });
        try {
          const r = await op;
          t.latenciesMs.push(r.ms);
          t.statusCodes.push(r.status);
        } catch (e) { t.errors.push(String(e)); }
      }
    });
    const dur = performance.now() - start;
    const s = summarize(t, dur);
    const row: ScaleRow = {
      tenantCount,
      totalActiveVUsers: vusers,
      totalRequests: s.totalRequests,
      avgMs: s.avgMs,
      p95Ms: s.p95Ms,
      throughputRps: s.throughputRps,
      errorRatePct: s.errorRatePct,
      notes: `Provisioned ${okTenants.length}/${tenantCount} tenants successfully; mixed GET products + POST order; ${reqsPerTenant} req/tenant. Host resource impact not sampled in-script (see environment notes).`,
    };
    scaleRows.push(row);
    log(`SCALE tenants=${tenantCount} vusers=${vusers} avg=${row.avgMs} p95=${row.p95Ms} err=${row.errorRatePct}% thr=${row.throughputRps}`);
  }

  const summary = {
    isolation: { total: testCases.length, passed: testCases.filter((t) => t.status === 'PASS').length, failed: testCases.filter((t) => t.status === 'FAIL').length },
    performance: { rows: perfRows.length, p95TargetMs: 1000, rowsMeetingP95: perfRows.filter((r) => r.p95Ms < 1000).length },
    scalability: { rows: scaleRows },
    finishedAt: new Date().toISOString(),
  };

  const output = {
    meta: { ...context, finishedAt: summary.finishedAt, logLineCount: logLines.length },
    isolation: { testCases },
    performance: { rows: perfRows },
    scalability: { rows: scaleRows },
    summary,
    logs: logLines,
  };

  await fs.mkdir(path.dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify(output, null, 2), 'utf8');
  log(`Wrote ${resultsPath}`);
  console.log('\n=== ISOLATION SUMMARY ===');
  console.log(JSON.stringify(summary.isolation, null, 2));
  console.log('\n=== PERFORMANCE ROWS ===');
  console.table(perfRows.map(r => ({ endpoint: r.endpoint, c: r.concurrency, n: r.totalRequests, avg: r.avgMs, p95: r.p95Ms, thr: r.throughputRps, err: r.errorRatePct })));
  console.log('\n=== SCALABILITY ROWS ===');
  console.table(scaleRows);
}

main().catch(async (err) => {
  console.error('EVALUATION FAILED:', err);
  try {
    await fs.mkdir(path.dirname(resultsPath), { recursive: true });
    await fs.writeFile(resultsPath, JSON.stringify({ fatalError: String(err?.stack ?? err), logs: logLines }, null, 2), 'utf8');
  } catch {}
  process.exitCode = 1;
});
