/**
 * Capture a true 390x1400 mobile viewport.
 *
 * Chrome clamps --window-size to a ~504px layout viewport even in headless
 * mode, so the direct --screenshot command produces a clipped desktop layout.
 * This uses the DevTools Protocol to set device metrics to 390x1400, then
 * captures the real mobile layout.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const URL = 'http://127.0.0.1:3000/';
const OUTPUT = 'C:\\dev\\kern\\docs\\screenshots\\05-mobile.png';
const profile = mkdtempSync(join(tmpdir(), 'kern-chrome-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore', windowsHide: true },
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForChrome(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome has not opened the port yet.
    }
    await delay(200);
  }
  throw new Error('Chrome did not open the DevTools port');
}

type Target = { type: string; webSocketDebuggerUrl: string };

await waitForChrome();
const targets = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as Target[];
const page = targets.find((target) => target.type === 'page');
if (!page) throw new Error('No page target');

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
const events = new Map<string, Array<() => void>>();
let nextId = 0;

socket.onmessage = (event) => {
  const message = JSON.parse(String(event.data)) as {
    id?: number;
    method?: string;
    result?: unknown;
    error?: { message?: string };
  };
  if (typeof message.id === 'number') {
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message ?? 'CDP error'));
    else waiter.resolve(message.result);
    return;
  }
  if (message.method) {
    const waiters = events.get(message.method);
    if (!waiters) return;
    events.delete(message.method);
    for (const resolve of waiters) resolve();
  }
};

await new Promise<void>((resolve, reject) => {
  socket.onopen = () => resolve();
  socket.onerror = () => reject(new Error('DevTools WebSocket failed'));
});

function send<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve: resolve as (value: any) => void, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function once(method: string): Promise<void> {
  return new Promise((resolve) => {
    const waiters = events.get(method) ?? [];
    waiters.push(resolve);
    events.set(method, waiters);
  });
}

try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 1400,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: URL });
  await loaded;
  await delay(500);

  const shot = await send<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  });
  writeFileSync(OUTPUT, Buffer.from(shot.data, 'base64'));
  const png = readFileSync(OUTPUT);
  console.log(
    `wrote ${OUTPUT} ${png.readUInt32BE(16)}x${png.readUInt32BE(20)} ${png.length} bytes`,
  );

  await send('Browser.close').catch(() => undefined);
} finally {
  socket.close();
  chrome.kill();
  await delay(300);
  rmSync(profile, { recursive: true, force: true });
}
