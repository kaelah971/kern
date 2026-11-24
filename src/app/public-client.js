(() => {
  const panel = document.querySelector('[data-check-panel]');
  if (!panel) return;

  const engineEl = panel.querySelector('[data-engine-status]');
  const cards = Array.from(panel.querySelectorAll('[data-check-card]'));
  const active = new Map();
  let engineOnline = panel.dataset.engineOnline === 'true';

  const formatIso = (iso) => {
    if (!iso) return 'no heartbeat recorded';
    return iso.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  };

  const setButtons = () => {
    for (const card of cards) {
      const scenario = card.dataset.cardScenario;
      const button = card.querySelector('[data-run]');
      if (!button || !scenario) continue;
      button.disabled = !engineOnline || active.has(scenario);
    }
  };

  const setEngine = (status) => {
    engineOnline = Boolean(status.online);
    panel.dataset.engineOnline = engineOnline ? 'true' : 'false';
    if (engineEl) {
      engineEl.textContent = engineOnline
        ? `Engine online · last heartbeat ${formatIso(status.lastHeartbeat)}`
        : `Engine offline · last heartbeat ${formatIso(status.lastHeartbeat)} · runs disabled`;
      engineEl.classList.toggle('engine-status--online', engineOnline);
      engineEl.classList.toggle('engine-status--offline', !engineOnline);
    }
    setButtons();
  };

  const api = async (path, options) => {
    const response = await fetch(path, options);
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      body,
      retryAfter: response.headers.get('retry-after'),
    };
  };

  const setStatus = (card, text) => {
    const el = card.querySelector('[data-job-status]');
    if (el) el.textContent = text;
  };

  const addLink = (card, href, label) => {
    const el = card.querySelector('[data-job-status]');
    if (!el) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    el.append(' ', link);
  };

  const poll = async (card, jobId) => {
    const scenario = card.dataset.cardScenario;
    if (!scenario) return;
    try {
      const res = await api(`/api/audits/${encodeURIComponent(jobId)}`);
      if (!res.ok || !res.body) {
        active.delete(scenario);
        setButtons();
        setStatus(card, `Status unavailable (${res.status}).`);
        return;
      }
      const job = res.body;
      if (job.status === 'queued' || job.status === 'running') {
        setStatus(card, job.status);
        setTimeout(() => void poll(card, jobId), 2000);
        return;
      }
      active.delete(scenario);
      setButtons();
      if (job.status === 'done' && job.audit) {
        setStatus(card, `Done: ${job.audit.overallStatus || 'done'}.`);
        addLink(card, `/runs/${encodeURIComponent(jobId)}`, 'X-Ray');
        addLink(card, `/runs/${encodeURIComponent(jobId)}/receipt`, 'receipt');
      } else if (job.status === 'failed') {
        setStatus(card, `Failed: ${job.error || 'the worker reported an error'}`);
      } else if (job.status === 'expired') {
        setStatus(card, 'Expired before the worker posted a result.');
      } else {
        setStatus(card, job.status);
      }
    } catch {
      active.delete(scenario);
      setButtons();
      setStatus(card, 'Network error while checking the run.');
    }
  };

  const run = async (card) => {
    const scenario = card.dataset.cardScenario;
    if (!scenario || active.has(scenario)) return;
    active.set(scenario, null);
    setButtons();
    setStatus(card, 'Submitting...');
    try {
      const res = await api('/api/audits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (res.status === 202 && res.body && res.body.jobId) {
        active.set(scenario, res.body.jobId);
        setStatus(card, 'queued');
        void poll(card, res.body.jobId);
        return;
      }
      active.delete(scenario);
      setButtons();
      if (res.status === 429) {
        const reason = res.body && res.body.reason ? res.body.reason : 'rate limited';
        const retry = res.body && res.body.retryAfterSeconds
          ? res.body.retryAfterSeconds
          : res.retryAfter || '?';
        setStatus(card, `Rate limited: ${reason}. Retry in ${retry}s.`);
      } else if (res.status === 503) {
        setStatus(card, (res.body && res.body.reason) || 'Engine offline.');
      } else {
        setStatus(
          card,
          (res.body && (res.body.reason || res.body.error)) ||
            `Could not queue (${res.status}).`,
        );
      }
    } catch {
      active.delete(scenario);
      setButtons();
      setStatus(card, 'Network error while queueing.');
    }
  };

  for (const card of cards) {
    const button = card.querySelector('[data-run]');
    if (button) button.addEventListener('click', () => void run(card));
  }

  const refreshEngine = async () => {
    try {
      const res = await api('/api/engine/status');
      if (res.ok && res.body) setEngine(res.body);
    } catch {
      // Keep the last known state; the server-rendered text remains.
    }
  };

  setButtons();
  void refreshEngine();
  setInterval(() => void refreshEngine(), 10_000);
})();
