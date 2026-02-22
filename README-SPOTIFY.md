
# Hipster 50 – Spotify-versie

Deze variant opent nummers in de **Spotify-app** (iOS/Android) of in de **webplayer**.
Echte **autoplay in de browser** is door Spotify beperkt; door op "Scan" te tikken
(= user gesture) kan de app direct een deeplink openen zodat de Spotify-app het nummer
start. In de webplayer kan soms nog één tik nodig zijn.

## Gebruik
- Houd in `songs.json` per item bij: `Service: "Spotify"` en zet `Link` als
  `https://open.spotify.com/track/<TRACKID>` of `spotify:track:<TRACKID>`.
- QR-tekst blijft: `SONG:Y1976` (korte code).

## Bestanden
- `index.html` – ongewijzigd
- `app.js` – **vervang** door `app.js` uit deze Spotify-versie
- `songs.json` – vul met jouw Spotify-tracks

## Diepe links
- iOS: `spotify://track/<TRACKID>`
- Android: `intent://open.spotify.com/track/<TRACKID>#Intent;scheme=https;package=com.spotify.music;end`

De app probeert automatisch de app te openen en valt terug op de webplayer.
