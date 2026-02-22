
// Hipster 50 – Spotify-variant: QR-scan, openen in Spotify-app, jaar op knopdruk
// Let op: echte autoplay (zonder extra tik) wordt door Spotify niet toegestaan in browsers.
// Deze app opent de Spotify-app of webplayer meteen na scannen (user gesture: de klik op "Scan").

let songsMap = new Map();
let current = null;
let scanner = null;

async function loadSongs() {
  try {
    const res = await fetch('songs.json', { cache: 'no-store' });
    const data = await res.json();
    songsMap = new Map(data.map(x => [x.QRText, x]));
  } catch (e) {
    console.error('Kon songs.json niet laden', e);
    alert('Kon songs.json niet laden.');
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
  try {
    // 1) Preflight: forceer permissieprompt
    if (navigator.mediaDevices?.getUserMedia) {
      const tmpStream = await navigator.mediaDevices.getUserMedia({ video: true });
      // meteen weer netjes sluiten
      tmpStream.getTracks().forEach(t => t.stop());
    }

    setYearVisible(false);
    enable('btn-year', false);
    enable('btn-stop', true);

    const divId = 'preview';
    const config = { fps: 10, qrbox: { width: 260, height: 260 }, rememberLastUsedCamera: true, aspectRatio: 1.0 };

    if (!scanner) {
      scanner = new Html5Qrcode(divId, /* verbose= */ false);
    } else {
      // als er nog oude preview staat, leeg die
      document.getElementById(divId).innerHTML = '';
    }

    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      alert('Geen camera gevonden of toegang geweigerd. Controleer browserpermissies en gebruik https.');
      enable('btn-stop', false);
      return;
    }

    const cameraId = cameras[0].id;
    await scanner.start(
      { deviceId: { exact: cameraId } },
      config,
      onScanSuccess,
      (err) => { /* scan errors negeren */ }
    );
  } catch (e) {
    console.error('StartScan fout', e);
    alert('Kan de camera niet openen. Controleer permissies (Safari/Chrome) en https.');
    enable('btn-stop', false);
  }
}

async function stopScan() {
  try {
    // Niet elke versie heeft getState(); gebruik defensieve checks
    if (scanner && typeof scanner.stop === 'function') {
      await scanner.stop();
    }
  } catch (e) {
    // negeren
  } finally {
    const el = document.getElementById('preview');
    if (el) el.innerHTML = '';
    enable('btn-stop', false);
  }
}

function extractSpotifyTrackId(urlOrUri) {
  // Ondersteun formaten: spotify:track:ID of https://open.spotify.com/track/ID
  try {
    if (urlOrUri.startsWith('spotify:track:')) return urlOrUri.split(':')[2];
    const u = new URL(urlOrUri);
    if (u.hostname.endsWith('spotify.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'track' && parts[1]) return parts[1];
    }
  } catch {}
  return null;
}

function openInSpotify(s) {
  // Probeer direct de Spotify-app te openen; val terug op webplayer
  const link = s.Link || '';
  const trackId = extractSpotifyTrackId(link);

  // iOS deep link
  const iosScheme = trackId ? `spotify://track/${trackId}` : (link.startsWith('spotify:') ? link : null);
  // Android intent (opent app indien geïnstalleerd)
  const androidIntent = trackId ? `intent://open.spotify.com/track/${trackId}#Intent;scheme=https;package=com.spotify.music;end` : null;
  const webUrl = link.startsWith('http') ? link : (trackId ? `https://open.spotify.com/track/${trackId}` : link);

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // We hebben net op "Scan" geklikt -> user gesture aanwezig; open zo snel mogelijk
  if (isIOS && iosScheme) {
    window.location.href = iosScheme;
    // Fallback naar webplayer na korte timeout
    setTimeout(() => { window.location.href = webUrl; }, 1200);
  } else if (isAndroid && androidIntent) {
    window.location.href = androidIntent;
    // Fallback naar webplayer
    setTimeout(() => { window.location.href = webUrl; }, 1200);
  } else {
    window.location.href = webUrl; // desktop of onbekend toestel
  }
}

function onScanSuccess(decodedText) {
  stopScan();
  let key = decodedText.trim();

  if (!key.toUpperCase().startsWith('SONG:')) {
    // QR bevat een URL -> open die direct
    try { const u = new URL(decodedText); window.location.href = u.toString(); return; } catch {}
  } else {
    key = key.toUpperCase();
  }

  current = songsMap.get(key) || null;
  if (!current) {
    setStatus('Onbekende code', 'Geen match voor: ' + key);
    enable('btn-year', false);
    return;
  }

  setStatus(`${current.Titel || 'Onbekend'} — ${current.Artiest || ''}`, 'Nummer geladen.');
  enable('btn-year', true);

  // Openen in Spotify (autoplay binnen de app; webplayer kan extra tik vragen)
  openInSpotify(current);
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadSongs();
  document.getElementById('btn-scan').addEventListener('click', startScan);
  document.getElementById('btn-stop').addEventListener('click', stopScan);
  document.getElementById('btn-year').addEventListener('click', () => {
    if (current) setYearVisible(true, String(current.Jaar || ''));
  });
});
