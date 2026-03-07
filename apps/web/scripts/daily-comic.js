/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
(function () {
  const PANELS_EL = document.getElementById('daily-degen-comic-panels');
  const DAY_EL = document.getElementById('daily-degen-comic-day');
  const MOOD_EL = document.getElementById('daily-degen-comic-mood');
  const SUBTITLE_EL = document.getElementById('daily-degen-comic-subtitle');
  const CREDIT_EL = document.getElementById('daily-degen-comic-credit');
  const UPDATED_EL = document.getElementById('daily-degen-comic-updated');
  const ARCHIVE_LIST_EL = document.getElementById('daily-degen-comic-archive-list');

  if (!PANELS_EL || !DAY_EL || !MOOD_EL || !SUBTITLE_EL) return;

  const REFRESH_MS = 5 * 60 * 1000;
  const cloudBaseCandidates = (() => {
    const explicit = (window.localStorage && localStorage.getItem('tc-comic-api-base')) || '';
    const fromGlobal = window.TC_COMIC_API_BASE || '';
    return [explicit, fromGlobal, '/api/comic', '/v1/comic']
      .map((v) => String(v || '').trim())
      .filter(Boolean);
  })();

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(day) {
    if (!day) return 'No comic yet';
    const date = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return day;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTimestamp(ts) {
    if (!ts) return '--';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return ts;
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function renderPanels(comic) {
    const panels = Array.isArray(comic?.panels) ? comic.panels.slice(0, 3) : [];
    if (panels.length === 0) {
      PANELS_EL.innerHTML = `
        <article class="degen-comic-panel">
          <h3 class="text-white text-lg font-semibold">No panel data yet</h3>
          <p class="text-gray-400 text-sm mt-2">Try generating today's payload from \`tools/channel-watcher/messages.jsonl\`.</p>
        </article>
      `;
      return;
    }

    PANELS_EL.innerHTML = panels.map((panel) => `
      <article class="degen-comic-panel">
        <h3 class="text-white text-lg font-semibold">${escapeHtml(panel.title || 'Untitled panel')}</h3>
        <p class="text-[#c6d4ef] text-sm mt-2">${escapeHtml(panel.caption || '')}</p>
        <blockquote class="degen-comic-quote">"${escapeHtml(panel.quote || '')}"</blockquote>
      </article>
    `).join('');
  }

  function renderCredits(comic) {
    if (!CREDIT_EL) return;
    const creator = String(comic?.credits?.creator || 'jmenichole');
    const rawArtistUrl = String(comic?.credits?.visualInspirationUrl || 'https://pheverdream.github.io/The-Book-of-SealStats/');

    let safeArtistUrl = 'https://pheverdream.github.io/The-Book-of-SealStats/';
    try {
      const parsed = new URL(rawArtistUrl, window.location.origin);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        safeArtistUrl = parsed.href;
      }
    } catch {
      // Keep fallback URL when input is invalid.
    }

    CREDIT_EL.textContent = '';
    CREDIT_EL.append('Visual inspiration credit: ');

    const link = document.createElement('a');
    link.className = 'text-[#8dc0ff] hover:text-[#b5d6ff]';
    link.setAttribute('href', safeArtistUrl);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
    link.textContent = 'Inspiration';
    CREDIT_EL.append(link);

    CREDIT_EL.append('. TiltCheck adaptation by ');
    const creatorSpan = document.createElement('span');
    creatorSpan.className = 'text-[#b6ffe7]';
    creatorSpan.textContent = creator;
    CREDIT_EL.append(creatorSpan);
    CREDIT_EL.append('.');
  }

  function renderUpdatedAt(comic) {
    if (!UPDATED_EL) return;
    UPDATED_EL.textContent = `Last updated: ${formatTimestamp(comic?.generatedAt)}`;
  }

  function renderArchive(comic, archiveFallback) {
    if (!ARCHIVE_LIST_EL) return;
    const recent = Array.isArray(comic?.archiveRecent) && comic.archiveRecent.length > 0
      ? comic.archiveRecent
      : (Array.isArray(archiveFallback) ? archiveFallback : []);
    const currentDate = comic?.date || null;
    const previous = recent
      .filter((item) => item && item.date !== currentDate)
      .slice(0, 8);

    if (previous.length === 0) {
      ARCHIVE_LIST_EL.innerHTML = '<li>No archived strips yet.</li>';
      return;
    }

    ARCHIVE_LIST_EL.innerHTML = previous.map((item) => {
      const day = escapeHtml(formatDate(item.date || ''));
      const mood = escapeHtml(item.mood || 'Degen weather: volatile');
      const line = escapeHtml(item.oneLiner || item.subtitle || item.title || '');
      return `<li><strong>${day}</strong> - ${mood}${line ? ` - ${line}` : ''}</li>`;
    }).join('');
  }

  async function loadArchiveFallback() {
    try {
      const response = await fetch(`/daily-degen-comic-archive.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return [];
      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      return Array.isArray(payload?.items) ? payload.items : [];
    } catch {
      return [];
    }
  }

  async function tryCloudCurrent() {
    for (const base of cloudBaseCandidates) {
      const url = `${base.replace(/\/$/, '')}/current?communityId=tiltcheck-discord&_=${Date.now()}`;
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) continue;
        const payload = await response.json();
        if (payload?.comic) return { comic: payload.comic, base };
      } catch {
        // Try next candidate.
      }
    }
    return null;
  }

  async function tryCloudArchive(base) {
    if (!base) return [];
    const url = `${base.replace(/\/$/, '')}/archive?communityId=tiltcheck-discord&limit=12&_=${Date.now()}`;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload?.items) ? payload.items : [];
    } catch {
      return [];
    }
  }

  async function loadComic() {
    try {
      const cloud = await tryCloudCurrent();
      let comic;
      let archiveFallback = [];

      if (cloud?.comic) {
        comic = cloud.comic;
        archiveFallback = await tryCloudArchive(cloud.base);
      } else {
        const response = await fetch(`/daily-degen-comic.json?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        comic = await response.json();
        archiveFallback = await loadArchiveFallback();
      }

      DAY_EL.textContent = formatDate(comic.date);
      MOOD_EL.textContent = comic.mood ? `Mood: ${comic.mood}` : '';
      SUBTITLE_EL.textContent = comic.subtitle || 'Daily comic from channel logs.';
      renderPanels(comic);
      renderCredits(comic);
      renderUpdatedAt(comic);
      renderArchive(comic, archiveFallback);
    } catch {
      DAY_EL.textContent = 'No comic yet';
      MOOD_EL.textContent = '';
      SUBTITLE_EL.textContent = 'Run comic generator to publish the daily storyline.';
      renderPanels({ panels: [] });
      renderCredits({});
      renderUpdatedAt({});
      renderArchive({}, []);
    }
  }

  loadComic();
  setInterval(loadComic, REFRESH_MS);
})();
