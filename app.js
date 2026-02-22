
// Hipster 50 – eenvoudige webapp met QR-scan, autoplay en jaar-op-knopdruk
// Vereist: songs.json in dezelfde map + html5-qrcode library (CDN in index.html)

let songsMap = new Map();
let current = null; // { code, jaar, artiest, titel, link }
let scanner = null;

async function loadSongs() {
  try {
    const res = await fetch('songs.json', { cache: 'no-store' });
    const data = await res.json();
    songsMap = new Map(data.map(x => [x.QRText, x]));
  } catch (e) {
    console.error('Kon songs.json niet laden', e);
    alert('Kon songs.json niet laden. Controleer hosting en bestandsnaam.');
  }
}

function setStatus(title, hint) {
  document.getElementById('songTitle').textContent = title || '';
  document.getElementById('songHint').textContent = hint || '';
}

function setYearVisible(v, value) {
  const el = document.getElementById('yearLabel');
  el.style.visibility = v ? 'visible' : 'hidden';
  el.textContent = v ? (value || '') : '';
}

function enable(btnId, v) { document.getElementById(btnId).disabled = !v; }

async function startScan() {
  setYearVisible(false);
  enable('btn-year', false);
  enable('btn-stop', true);

  const divId = 'preview';
  const config = { fps: 10, qrbox: { width: 260, height: 260 }, rememberLastUsedCamera: true, aspectRatio: 1.0 };

  if (!scanner) {
    scanner = new Html5Qrcode(divId, /* verbose= */ false);
  }

  const cameras = await Html5Qrcode.getCameras();
  const cameraId = cameras?.[0]?.id;
  if (!cameraId) {
    alert('Geen camera gevonden. Geef cameratoegang in de browser.');
    return;
  }

  await scanner.start(
    { deviceId: { exact: cameraId } },
    config,
    onScanSuccess,
    (err) => { /* ignore scan errors */ }
  );
}

async function stopScan() {
  if (scanner && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
    await scanner.stop();
  }
  // Leeg de preview
  const el = document.getElementById('preview');
  el.innerHTML = '';
  enable('btn-stop', false);
}

function openYouTube(url) {
  // Forceer autoplay als query: ?autoplay=1&playsinline=1
  try {
    const u = new URL(url);
    if (!u.searchParams.has('autoplay')) u.searchParams.set('autoplay','1');
    if (!u.searchParams.has('playsinline')) u.searchParams.set('playsinline','1');
    // Open in dezelfde tab: de tik op "Scan" telt als user gesture, wat helpt voor autoplay
    window.location.href = u.toString();
  } catch {
    window.location.href = url + (url.includes('?') ? '&' : '?') + 'autoplay=1&playsinline=1';
  }
}

function playSong(s) {
  // Kies gedrag per service; YouTube is het betrouwbaarst voor (semi-)autoplay
  if (!s || !s.Link) {
    alert('Geen link beschikbaar voor deze code.');
    return;
  }
  if ((s.Service || '').toLowerCase() === 'youtube') {
    openYouTube(s.Link);
  } else {
    // Fallback: open link (Spotify/Apple vaak 1 extra tik)
    window.location.href = s.Link;
  }
}

function onScanSuccess(decodedText) {
  // Verwacht: "SONG:XXXX" of rechtstreeks een URL
  stopScan();
  let key = decodedText.trim();

  if (key.toUpperCase().startsWith('SONG:')) {
    key = key.toUpperCase();
  } else {
    // Als het een URL is, ga erheen en keer terug met back
    try {
      const url = new URL(decodedText);
      window.location.href = url.toString();
      return;
    } catch {}
  }

  current = songsMap.get(key) || null;
  if (!current) {
    setStatus('Onbekende code', 'Geen match gevonden voor: ' + key);
    enable('btn-year', false);
    return;
  }

  setStatus(`${current.Titel || 'Onbekend'} — ${current.Artiest || ''}`, 'Nummer geladen.');
  enable('btn-year', true);

  // Speel direct af met autoplay
  playSong(current);
}

// UI events
window.addEventListener('DOMContentLoaded', async () => {
  await loadSongs();
  document.getElementById('btn-scan').addEventListener('click', startScan);
  document.getElementById('btn-stop').addEventListener('click', stopScan);
  document.getElementById('btn-year').addEventListener('click', () => {
    if (current) setYearVisible(true, String(current.Jaar || ''));
  });
});
