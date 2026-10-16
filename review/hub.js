(() => {
  const C = window.REVIEW_CONFIG, D = window.ROUND_DATA;
  const $ = (id) => document.getElementById(id);
  const store = { get(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* storage unavailable */ } } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NAMES = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', twitter: 'X' };
  const FORMATS = { reel: 'Reel', story: 'Story', short: 'Short', video: 'Video', post: 'Post' };
  const STATE = { draft: 'Not sent', submitting: 'Sending…', uncertain: 'Check Metricool', scheduled: 'Scheduled', published: 'Published', failed: 'Metricool refused it' };

  let live = {};              // task_id -> server status
  let settings = null, connected = false;
  let ownerCode = store.get('otm-owner-code');
  let isOwner = false;
  let current = -1, tab = 0, decision = '', requestId = null, savedKey = '';

  async function api(body) {
    const r = await fetch(C.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.publishableKey }, body: JSON.stringify({ p_campaign: C.campaign, ...body }) });
    const v = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(v.message || 'The review service did not answer.');
    return v;
  }
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

  const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const sameRevision = (day) => live[day.task_id] && live[day.task_id].fingerprint === day.fingerprint;

  function dayStatus(day) {
    const s = live[day.task_id];
    if (day.on_hold) return ['On hold', 'muted'];
    if (!s) return connected ? ['Not in the review service', 'bad'] : ['Awaiting review', 'muted'];
    if (!sameRevision(day)) return ['Page out of date: refresh', 'bad'];
    const pubs = s.publications || [];
    if (pubs.some((p) => p.attention)) return ['Needs attention', 'bad'];
    if (pubs.length && pubs.every((p) => p.state === 'published')) return ['Published', 'ok'];
    if (pubs.some((p) => p.state === 'uncertain' || p.state === 'failed')) return ['Check Metricool', 'warn'];
    if (pubs.length && pubs.every((p) => p.state === 'scheduled' || p.state === 'published')) return ['Scheduled', 'ok'];
    if (pubs.some((p) => p.state === 'scheduled' || p.state === 'submitting')) return ['Partly scheduled', 'warn'];
    const od = s.owner_decision && s.owner_decision.decision;
    if (od === 'yes') return [pubs.some((p) => p.send_requested) ? 'Sent to Metricool' : 'Approved', 'ok'];
    if (od === 'no') return ['Rejected', 'bad'];
    if (od === 'changes_needed') return ['Changes needed', 'warn'];
    return [s.feedback_count ? `Awaiting Ashraf · ${s.feedback_count} review${s.feedback_count > 1 ? 's' : ''}` : 'Awaiting review', 'muted'];
  }

  function renderCards() {
    $('campaign-title').textContent = D.title;
    $('cards').innerHTML = D.days.map((d, i) => {
      const [label, cls] = dayStatus(d);
      return `<button class="card" type="button" data-i="${i}"><video src="${esc(d.video_url)}#t=1" preload="metadata" muted playsinline aria-hidden="true" tabindex="-1"></video>
        <div class="body"><div class="date">${esc(fmtDate(d.date))} · ${esc(d.time)}</div><div class="ttl">${esc(d.label)}: ${esc(d.title)}</div><span class="pill ${cls}">${esc(label)}</span></div></button>`;
    }).join('');
  }

  function renderTabs(day) {
    $('d-tabs').innerHTML = day.placements.map((p, i) => `<button role="tab" type="button" data-t="${i}" aria-selected="${i === tab}">${esc(p.label)}</button>`).join('');
    const p = day.placements[tab];
    const body = p.platform === 'instagram' && p.format === 'story'
      ? '<p class="small">The Reel is shared to the Story. No caption.</p>'
      : `${p.title ? `<div class="t">${esc(p.title)}</div>` : ''}<pre>${esc(p.text)}</pre>`;
    $('d-copy').innerHTML = body + `<div class="meta"><span class="small">${p.text.length} characters${p.platform === 'twitter' && p.text.length > 280 ? ' · over X’s 280 limit' : ''}</span>${p.text ? '<button type="button" id="copy-btn">Copy text</button>' : ''}</div>`;
    const cb = $('copy-btn');
    if (cb) cb.onclick = async () => { try { await navigator.clipboard.writeText((p.title ? p.title + '\n\n' : '') + p.text); cb.textContent = 'Copied'; } catch { cb.textContent = 'Copy failed'; } };
  }

  function renderPublish(day) {
    const s = live[day.task_id];
    const pubs = s ? s.publications : [];
    $('pb-list').innerHTML = day.placements.map((p) => {
      const x = pubs.find((q) => q.platform === p.platform && q.format === p.format);
      if (!x) return `<li><span>${esc(p.label)}</span><span class="pill muted">${connected ? 'Not set up' : 'Unknown'}</span></li>`;
      const cls = x.attention ? 'bad' : x.state === 'scheduled' || x.state === 'published' ? 'ok' : x.state === 'draft' ? (x.approved ? 'nile' : 'muted') : 'warn';
      const label = x.state === 'draft' && x.approved ? (x.send_requested ? 'Approved · queued to send' : 'Approved · not sent') : STATE[x.state];
      const links = [x.metricool_post_id ? `Metricool ID ${esc(x.metricool_post_id)}` : '', x.live_url ? `<a href="${esc(x.live_url)}" target="_blank" rel="noopener">Live post ↗</a>` : '', x.planner_url ? `<a href="${esc(x.planner_url)}" target="_blank" rel="noopener">Planner ↗</a>` : ''].filter(Boolean).join(' · ');
      // Until Metricool is set up, one line says so instead of repeating every setup step per platform.
      let blockers = x.blockers || [];
      if (settings && !settings.brand_connected) blockers = blockers.filter((b) => !/Metricool|connected/.test(b)).concat('Metricool not set up yet');
      const why = x.attention || (blockers.length ? 'Before sending: ' + blockers.join(' · ') : '');
      return `<li><span>${esc(p.label)}</span><span class="pill ${cls}">${esc(label)}</span>${links ? `<span class="why">${links}</span>` : ''}${why ? `<span class="why">${esc(why)}</span>` : ''}</li>`;
    }).join('');
    const od = s && s.owner_decision && s.owner_decision.decision;
    const sendable = isOwner && settings && settings.enabled && !settings.auto_schedule && od === 'yes' && pubs.some((x) => x.state === 'draft' && x.approved && !x.send_requested);
    $('pb-send').hidden = !sendable;
  }

  function reviewKey() { return [current, $('rv-name').value.trim(), decision, $('rv-msg').value.trim(), isOwner].join('|'); }
  function setState(text, cls) { const el = $('rv-state'); el.textContent = text; el.className = 'state ' + (cls || ''); }
  function onReviewEdit() {
    $('rv-req').textContent = decision === 'changes_needed' ? '(required: say what to change)' : '(optional)';
    if (reviewKey() !== savedKey) { requestId = null; setState(decision ? 'Not saved' : 'Choose Yes, Changes needed or No', ''); }
    $('rv-save').disabled = !decision || !$('rv-name').value.trim() || (decision === 'changes_needed' && !$('rv-msg').value.trim()) || !connected;
  }

  function openDay(i) {
    current = i; tab = 0; decision = ''; requestId = null; savedKey = '';
    const d = D.days[i];
    $('d-eyebrow').textContent = `${fmtDate(d.date)} · ${d.label}`;
    $('d-title').textContent = d.title;
    $('d-time').textContent = `Posts at ${d.time} ${D.timezone} time on ${new Date(d.date + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}. Revision ${d.revision}.`;
    const [label, cls] = dayStatus(d);
    $('d-pill').textContent = label; $('d-pill').className = 'pill ' + cls;
    $('d-note').hidden = !d.note; $('d-note').textContent = d.note || '';
    const v = $('d-video'); if (v.getAttribute('src') !== d.video_url) v.src = d.video_url;
    $('d-prev').disabled = i === 0; $('d-next').disabled = i === D.days.length - 1;
    document.querySelectorAll('.choices button').forEach((b) => b.setAttribute('aria-checked', 'false'));
    $('rv-msg').value = '';
    $('rv-name').value = $('rv-name').value || store.get('otm-reviewer') || (isOwner ? 'Ashraf' : '');
    $('rv-scope').textContent = isOwner
      ? 'You are signed in as owner. Your Yes approves the video, every platform\'s text and the posting time for this day. It does not send anything by itself.'
      : 'Your review is saved as feedback for Ashraf. Only his decision approves a post.';
    const s = live[d.task_id];
    $('rv-last').textContent = s && s.owner_decision ? `Ashraf's latest decision on this revision: ${({ yes: 'Yes', no: 'No', changes_needed: 'Changes needed' })[s.owner_decision.decision]} (${new Date(s.owner_decision.at).toLocaleString('en-AU')}).` : '';
    $('pb-state').textContent = '';
    renderTabs(d); renderPublish(d); onReviewEdit();
    if (!$('day').open) $('day').showModal();
  }

  async function saveReview() {
    const d = D.days[current];
    if (!sameRevision(d)) { setState('This post changed since the page loaded. Refresh before reviewing.', 'bad'); return; }
    const key = reviewKey();
    if (!requestId) requestId = uuid();  // the same id is reused on retry, so a timeout never saves twice
    setState('Saving…', 'busy'); $('rv-save').disabled = true;
    try {
      const r = await api({ action: 'submit', p_task: d.task_id, p_revision: d.revision, p_fingerprint: d.fingerprint, p_reviewer: $('rv-name').value.trim(), p_decision: decision, p_message: $('rv-msg').value, p_request_id: requestId, p_website: $('rv-website').value, owner_code: isOwner ? ownerCode : undefined });
      if (!r.receipt_id) throw new Error('No receipt came back.');
      savedKey = key;
      store.set('otm-reviewer', $('rv-name').value.trim());
      setState(`Saved ${new Date(r.saved_at).toLocaleTimeString('en-AU')}${r.is_owner ? ' as owner decision' : ''} · receipt ${r.receipt_id.slice(0, 8)}`, 'ok');
      await refresh();
      renderPublish(d);
      const [label, cls] = dayStatus(d); $('d-pill').textContent = label; $('d-pill').className = 'pill ' + cls;
    } catch (e) {
      setState('Not saved: ' + e.message, 'bad');
    } finally { $('rv-save').disabled = false; }
  }

  async function sendDay() {
    const d = D.days[current];
    if (!confirm(`Send ${d.label} (${fmtDate(d.date)} at ${d.time}) to Metricool for all approved platforms?`)) return;
    $('pb-send').disabled = true; $('pb-state').textContent = 'Sending to Metricool…'; $('pb-state').className = 'state busy';
    try {
      const r = await api({ action: 'send', p_task: d.task_id, p_revision: d.revision, p_fingerprint: d.fingerprint, owner_code: ownerCode });
      const n = (r.results || []).length, ok = (r.results || []).filter((x) => x.state === 'scheduled').length;
      $('pb-state').textContent = n ? `${ok} of ${n} confirmed scheduled in Metricool.` : 'Nothing was ready to send. See the notes under each platform.';
      $('pb-state').className = 'state ' + (n && ok === n ? 'ok' : 'bad');
    } catch (e) { $('pb-state').textContent = 'Not sent: ' + e.message; $('pb-state').className = 'state bad'; }
    $('pb-send').disabled = false;
    await refresh(); renderPublish(d);
  }

  function renderOwner() {
    $('owner-badge').textContent = isOwner ? 'Owner' : 'Not signed in as owner';
    $('owner-badge').className = 'pill ' + (isOwner ? 'ok' : 'muted');
    $('mc-panel').hidden = !isOwner;
    if (!settings) return;
    $('mc-enabled').checked = settings.enabled; $('mc-auto').checked = settings.auto_schedule;
    $('mc-auto').disabled = !settings.enabled;
    $('mc-state').textContent = !window.__mcReady ? 'Metricool is not connected to the review service yet.'
      : settings.brand_connected ? `Brand: ${settings.brand_label}. Accounts confirmed: ${settings.verified_networks.map((n) => NAMES[n] || n).join(', ') || 'none'}${settings.connections_verified_at ? ` (checked ${new Date(settings.connections_verified_at).toLocaleString('en-AU')})` : ''}.`
      : 'Metricool is connected, but the One Tail brand has not been checked yet.';
  }

  async function checkOwner(code, remember) {
    try {
      const r = await api({ action: 'check_owner', owner_code: code });
      isOwner = !!r.owner;
      if (isOwner) { ownerCode = code; store.set('otm-owner-code', remember ? code : ''); $('owner-msg').textContent = 'Signed in as owner on this page.'; }
      else { ownerCode = ''; store.set('otm-owner-code', ''); $('owner-msg').textContent = window.__ownerCodeSet === false ? 'No owner code has been set up in Supabase yet.' : 'That code is not right.'; }
    } catch (e) { $('owner-msg').textContent = e.message; }
    renderOwner(); renderCards();
  }

  async function configure(enabled, auto) {
    if (auto && !confirm('Turn on auto-scheduling? From now on, every post you approve goes to Metricool without pressing Send.')) { renderOwner(); return; }
    try { settings = await api({ action: 'configure', owner_code: ownerCode, enabled, auto_schedule: auto }); $('mc-msg').textContent = 'Saved.'; }
    catch (e) { $('mc-msg').textContent = 'Not changed: ' + e.message; }
    renderOwner();
  }

  async function refresh() {
    try {
      const r = await api({ action: 'status' });
      live = Object.fromEntries((r.days || []).map((x) => [x.task_id, x]));
      settings = r.settings; window.__mcReady = r.metricool_ready; window.__ownerCodeSet = r.owner_code_set;
      connected = true;
      const stale = D.days.filter((d) => live[d.task_id] && !sameRevision(d)).length;
      $('connection').textContent = stale ? 'Connected, but this page is out of date. Refresh it.' : 'Connected · reviews save to One Tail\'s review service';
      $('connection').className = 'connection ' + (stale ? 'bad' : 'ok');
    } catch (e) {
      connected = false;
      $('connection').textContent = 'Not connected: reviews cannot be saved right now. ' + e.message;
      $('connection').className = 'connection bad';
    }
    renderCards(); renderOwner();
    if (current >= 0 && $('day').open) onReviewEdit();
  }

  // Events
  $('cards').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) openDay(+c.dataset.i); });
  $('d-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { tab = +b.dataset.t; renderTabs(D.days[current]); } });
  $('d-close').onclick = () => { $('d-video').pause(); $('day').close(); };
  $('day').addEventListener('close', () => $('d-video').pause());
  $('d-prev').onclick = () => openDay(current - 1);
  $('d-next').onclick = () => openDay(current + 1);
  document.querySelector('.choices').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    decision = b.dataset.d;
    document.querySelectorAll('.choices button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    onReviewEdit();
  });
  $('rv-name').addEventListener('input', onReviewEdit);
  $('rv-msg').addEventListener('input', onReviewEdit);
  $('rv-save').onclick = saveReview;
  $('pb-send').onclick = sendDay;
  $('owner-toggle').onclick = () => { $('owner-panel').hidden = !$('owner-panel').hidden; if (!$('owner-panel').hidden) $('owner-code').focus(); };
  $('owner-form').addEventListener('submit', (e) => { e.preventDefault(); checkOwner($('owner-code').value, $('owner-remember').checked); });
  $('mc-enabled').onchange = () => configure($('mc-enabled').checked, $('mc-enabled').checked && $('mc-auto').checked);
  $('mc-auto').onchange = () => configure($('mc-enabled').checked, $('mc-auto').checked);
  $('mc-verify').onclick = async () => {
    $('mc-msg').textContent = 'Checking Metricool…';
    try { const r = await api({ action: 'verify_metricool', owner_code: ownerCode }); $('mc-msg').textContent = `Found ${r.brand}: ${r.networks.map((n) => NAMES[n] || n).join(', ') || 'no accounts connected'}.`; }
    catch (e) { $('mc-msg').textContent = e.message; }
    await refresh();
  };

  renderCards();
  refresh().then(() => { if (ownerCode) checkOwner(ownerCode, true); });
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
