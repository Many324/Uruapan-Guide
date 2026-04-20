// ================================================================
// URUAPAN GUIDE — App logic
// Data is loaded from places.json. To add/edit a place, open that
// file and follow the format. No need to touch this file.
// ================================================================

let places = [];
let activeFilter = 'all';
let gridQuery = '';
let videoOnly = false;
let map;
const markers = {};

// ---- Load data and kick off the app ----
async function init() {
  try {
    const res = await fetch('places.json');
    if (!res.ok) throw new Error('No se pudo cargar places.json');
    places = await res.json();
  } catch (e) {
    document.getElementById('grid').innerHTML =
      `<div class="loading" style="color:var(--rose)">Error cargando los lugares: ${e.message}. Asegúrate de estar sirviendo el sitio con un servidor local (no abriendo el HTML directamente).</div>`;
    return;
  }
  updateHeroStats();
  initMap();
  renderGrid();
  renderMapResults();
  wireControls();
}

// ---- Helpers ----
const gmapsLink = p =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.nombre + ' ' + p.ubicacion)}&query_place_id=${p.placeId}`;

const formatReviews = n => n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'k' : n;

const hasVideos = p => Array.isArray(p.videos) && p.videos.length > 0;

// Detect video platform from URL
function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'facebook';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'other';
}

// Build an embed URL for each platform
function buildEmbed(url) {
  const platform = detectPlatform(url);
  try {
    if (platform === 'tiktok') {
      // TikTok URL: https://www.tiktok.com/@user/video/1234567890
      const match = url.match(/\/video\/(\d+)/);
      if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`;
      return null;
    }
    if (platform === 'youtube') {
      // Multiple formats: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/shorts/ID
      let id = null;
      const shortsMatch = url.match(/\/shorts\/([\w-]+)/);
      const watchMatch = url.match(/[?&]v=([\w-]+)/);
      const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
      if (shortsMatch) id = shortsMatch[1];
      else if (watchMatch) id = watchMatch[1];
      else if (shortMatch) id = shortMatch[1];
      if (id) return `https://www.youtube.com/embed/${id}`;
      return null;
    }
    if (platform === 'instagram') {
      // Instagram Reel: https://www.instagram.com/reel/CODE/
      const match = url.match(/\/(reel|p)\/([\w-]+)/);
      if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
      return null;
    }
    if (platform === 'facebook') {
      // Facebook videos can't always be embedded without an app ID,
      // but the public video plugin works for most public posts.
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=400`;
    }
  } catch (e) {
    return null;
  }
  return null;
}

const platformLabel = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  other: 'Video'
};

// ---- Stats ----
function updateHeroStats() {
  document.getElementById('stat-places').textContent = places.length;
  const videoCount = places.reduce((sum, p) => sum + (p.videos?.length || 0), 0);
  document.getElementById('stat-videos').textContent = videoCount;
  const avg = places.reduce((s, p) => s + (p.rating || 0), 0) / places.length;
  document.getElementById('stat-rating').textContent = avg.toFixed(1);
}

// ---- Flower SVG (decorative) ----
const flowerSVG = `
<svg class="card-flower" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g fill="currentColor">
    <circle cx="100" cy="100" r="18"/>
    <ellipse cx="100" cy="50" rx="16" ry="32"/>
    <ellipse cx="100" cy="150" rx="16" ry="32"/>
    <ellipse cx="50" cy="100" rx="32" ry="16"/>
    <ellipse cx="150" cy="100" rx="32" ry="16"/>
    <ellipse cx="65" cy="65" rx="24" ry="12" transform="rotate(-45 65 65)"/>
    <ellipse cx="135" cy="65" rx="24" ry="12" transform="rotate(45 135 65)"/>
    <ellipse cx="65" cy="135" rx="24" ry="12" transform="rotate(45 65 135)"/>
    <ellipse cx="135" cy="135" rx="24" ry="12" transform="rotate(-45 135 135)"/>
  </g>
</svg>`;

// ---- GRID ----
function renderGrid() {
  const grid = document.getElementById('grid');
  const filtered = places.filter(p => {
    const matchCat = activeFilter === 'all' || p.cat === activeFilter;
    const matchVideo = !videoOnly || hasVideos(p);
    const q = gridQuery.toLowerCase().trim();
    const matchQ = !q ||
      p.nombre.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.ubicacion.toLowerCase().includes(q) ||
      p.catLabel.toLowerCase().includes(q);
    return matchCat && matchVideo && matchQ;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:60px 20px;text-align:center;color:var(--ink-2);opacity:.6">
      <p style="font-family:'Fraunces',serif;font-size:24px;font-style:italic;margin-bottom:8px">Nada por aquí</p>
      <p style="font-size:14px">Intenta con otra búsqueda o categoría.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const hasVid = hasVideos(p);
    const textColor = p.cat === 'turismo' ? 'rgba(26,20,16,.6)' : 'rgba(251,247,236,.5)';
    const videoChips = hasVid ? `
      <div class="card-video-chips">
        ${p.videos.map((v, vi) => `
          <button class="video-chip" onclick="openVideoModal('${p.id}', ${vi})">
            ▶ ${platformLabel[detectPlatform(v.url)]}${v.label ? ' · ' + escapeHtml(v.label) : ''}
          </button>
        `).join('')}
      </div>
    ` : '';

    return `
      <article class="card ${hasVid ? 'has-video' : ''}" data-id="${p.id}">
        <div class="card-visual cat-${p.cat} ${hasVid ? 'clickable' : ''}"
             ${hasVid ? `onclick="openVideoModal('${p.id}', 0)"` : ''}>
          ${hasVid ? `<div class="video-badge"><span class="pulse"></span>Video</div>` : ''}
          <div style="color:${textColor}">${flowerSVG}</div>
          <div class="card-visual-inner">
            <div class="card-number">${String(i+1).padStart(2,'0')}</div>
            <div class="card-cat">${p.catLabel}</div>
          </div>
          ${hasVid ? `
            <div class="card-play-overlay">
              <div class="card-play-btn">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="card-body">
          <h3>${escapeHtml(p.nombre)}</h3>
          <div class="card-rating">
            <span class="star">★</span>
            <span class="rate-num">${p.rating.toFixed(1)}</span>
            <span class="rate-count">(${formatReviews(p.reviews)} reseñas)</span>
          </div>
          <p class="card-desc">${escapeHtml(p.desc)}</p>
          ${videoChips}
          <div class="card-meta">
            <div class="card-meta-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${escapeHtml(p.ubicacion)}</span>
            </div>
            <div class="card-meta-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${escapeHtml(p.horario)}</span>
            </div>
            ${p.tel ? `<div class="card-meta-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>
              <span>${escapeHtml(p.tel)}</span>
            </div>` : ''}
          </div>
          <div class="card-actions">
            ${hasVid ? `<button class="card-btn primary-video" onclick="openVideoModal('${p.id}', 0)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Ver video del lugar
            </button>` : ''}
            <a class="card-btn" href="${gmapsLink(p)}" target="_blank" rel="noopener">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Google Maps
            </a>
            <button class="card-btn secondary" onclick="focusOnMap('${p.id}')">Ver en mapa</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ---- MAP ----
function initMap() {
  map = L.map('map', {zoomControl:true, scrollWheelZoom:false}).setView([19.420, -102.065], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  places.forEach(p => {
    const hasVid = hasVideos(p);
    const icon = L.divIcon({
      className: '',
      html: `<div class="custom-pin cat-${p.cat} ${hasVid ? 'has-video' : ''}"><span>${p.nombre.charAt(0)}</span></div>`,
      iconSize: [28,28],
      iconAnchor: [14,28],
      popupAnchor: [0,-28]
    });
    const m = L.marker([p.lat, p.lng], {icon}).addTo(map);
    const videoButtons = hasVid ? `
      <div class="popup-videos">
        ${p.videos.map((v, vi) => `
          <a class="popup-video-btn" onclick="openVideoModal('${p.id}', ${vi})">▶ ${platformLabel[detectPlatform(v.url)]}</a>
        `).join('')}
      </div>` : '';
    m.bindPopup(`
      <div class="popup">
        <div class="popup-cat">${p.catLabel}</div>
        <h4>${escapeHtml(p.nombre)}</h4>
        <div class="popup-rating">★ ${p.rating.toFixed(1)} · ${formatReviews(p.reviews)} reseñas</div>
        <a class="popup-link" href="${gmapsLink(p)}" target="_blank" rel="noopener">Abrir en Google Maps →</a>
        ${videoButtons}
      </div>
    `);
    markers[p.id] = m;
  });

  const bounds = L.latLngBounds(places.filter(p => p.lat > 19.38).map(p => [p.lat, p.lng]));
  if (bounds.isValid()) map.fitBounds(bounds, {padding:[30,30]});
  setTimeout(() => map.invalidateSize(), 200);
}

function focusOnMap(id) {
  const p = places.find(x => x.id === id);
  if (!p) return;
  document.getElementById('mapa').scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(() => {
    map.setView([p.lat, p.lng], 15, {animate:true});
    markers[id].openPopup();
  }, 400);
}

// ---- MAP-SIDE RESULTS ----
function renderMapResults() {
  const q = document.getElementById('mapSearch').value.toLowerCase().trim();
  const filtered = places.filter(p => {
    if (!q) return true;
    return p.nombre.toLowerCase().includes(q) ||
           p.desc.toLowerCase().includes(q) ||
           p.catLabel.toLowerCase().includes(q) ||
           p.ubicacion.toLowerCase().includes(q);
  });
  const container = document.getElementById('mapResults');
  if (!filtered.length) {
    container.innerHTML = `<div class="map-none">Sin resultados para "${escapeHtml(q)}"</div>`;
    return;
  }
  container.innerHTML = filtered.map((p, i) => `
    <div class="map-result" data-id="${p.id}">
      <div class="map-result-num">${String(i+1).padStart(2,'0')}</div>
      <div class="map-result-body">
        <div class="map-result-name">
          ${escapeHtml(p.nombre)}
          ${hasVideos(p) ? '<span class="map-result-vid">▶</span>' : ''}
        </div>
        <div class="map-result-meta">
          <span class="map-result-rating">★ ${p.rating.toFixed(1)}</span>
          <span>·</span>
          <span>${p.catLabel}</span>
        </div>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.map-result').forEach(el => {
    el.addEventListener('click', () => {
      focusOnMap(el.dataset.id);
      container.querySelectorAll('.map-result').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    });
  });
}

// ---- VIDEO MODAL ----
let currentVideoPlace = null;
let currentVideoIndex = 0;

function openVideoModal(placeId, videoIndex = 0) {
  const p = places.find(x => x.id === placeId);
  if (!p || !hasVideos(p)) return;
  currentVideoPlace = p;
  currentVideoIndex = videoIndex;
  document.getElementById('modalTitle').textContent = p.nombre;
  renderVideoTabs();
  renderCurrentVideo();
  const modal = document.getElementById('videoModal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderVideoTabs() {
  const tabs = document.getElementById('videoTabs');
  if (!currentVideoPlace.videos || currentVideoPlace.videos.length <= 1) {
    tabs.innerHTML = '';
    tabs.style.display = 'none';
    return;
  }
  tabs.style.display = 'flex';
  tabs.innerHTML = currentVideoPlace.videos.map((v, i) => `
    <button class="video-tab ${i === currentVideoIndex ? 'active' : ''}" onclick="switchVideo(${i})">
      ${platformLabel[detectPlatform(v.url)]}${v.label ? ' · ' + escapeHtml(v.label) : ''}
    </button>
  `).join('');
}

function switchVideo(i) {
  currentVideoIndex = i;
  renderVideoTabs();
  renderCurrentVideo();
}

function renderCurrentVideo() {
  const v = currentVideoPlace.videos[currentVideoIndex];
  const embed = buildEmbed(v.url);
  const wrap = document.getElementById('videoWrap');
  const external = document.getElementById('videoExternal');

  if (embed) {
    wrap.innerHTML = `<iframe src="${embed}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>`;
  } else {
    wrap.innerHTML = `<div style="color:#fff;display:flex;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;font-size:14px">
      Este video no se puede incrustar aquí.<br>Ábrelo directamente en la plataforma ↓
    </div>`;
  }
  external.innerHTML = `Abrir en ${platformLabel[detectPlatform(v.url)]}: <a href="${v.url}" target="_blank" rel="noopener">${v.url.replace(/^https?:\/\//, '').slice(0,40)}…</a>`;
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  modal.classList.remove('open');
  document.getElementById('videoWrap').innerHTML = ''; // stop playback
  document.body.style.overflow = '';
}

// Close on backdrop click or Escape
document.addEventListener('click', e => {
  if (e.target.id === 'videoModal') closeVideoModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeVideoModal();
});

// ---- CONTROLS WIRING ----
function wireControls() {
  document.querySelectorAll('.filter[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.cat;
      renderGrid();
    });
  });
  document.getElementById('gridSearch').addEventListener('input', e => {
    gridQuery = e.target.value;
    renderGrid();
  });
  document.getElementById('videoToggle').addEventListener('click', () => {
    videoOnly = !videoOnly;
    document.getElementById('videoToggle').classList.toggle('active', videoOnly);
    renderGrid();
  });
  document.getElementById('mapSearch').addEventListener('input', renderMapResults);
}

// Expose to HTML onclicks
window.focusOnMap = focusOnMap;
window.openVideoModal = openVideoModal;
window.switchVideo = switchVideo;
window.closeVideoModal = closeVideoModal;

init();
