/* script.js
   Erzeugt 24 Türchen automatisch, verwaltet Locking + Toggle + einfache Rätselprüfung.
   Auf Deutsch kommentiert und einfach anpassbar.
*/

//////////////////////////
// Konfiguration / Inhalte
//////////////////////////

// Trage hier deine Inhalte ein. Für Tage ohne Rätsel genügt q:"", a:"", dann öffnet die Tür sofort.
const entries = [
  { q: "ASCII: 72 97 108 108 111 → Welche Begrüßung steht da?", a: "hallo", hint: "Unter dem Kissen" },
  { q: "Ich bin klein, aus Plastik, stecke im USB-Port — was bin ich?", a: "usbstick", hint: "Schublade" },
  { q: "Binär: 1010 (dezimal) = ?", a: "10", hint: "Im Bücherregal" },
  { q: "", a: "", hint: "Hinter dem Monitor" }, // kein Rätsel: öffnet sofort
  { q: "Ich passe in die Jackentasche, trage dich warm — was bin ich?", a: "handschuh", hint: "In der Jacke" },
  { q: "", a: "", hint: "Unter dem Sofa-Kissen" },
  { q: "Welche Versionsverwaltung beginnt mit 'g'?", a: "git", hint: "Auf dem Schreibtisch" },
  { q: "", a: "", hint: "In der kleinen Schublade" },
  { q: "", a: "", hint: "Auf dem Kühlschrank" },
  { q: "Zehn mal Eins = ?", a: "10", hint: "Hinter dem Bilderrahmen" },
  { q: "", a: "", hint: "Unter dem Rucksack" },
  { q: "Hex 0x1A = ?", a: "26", hint: "Im Schuhregal" },
  { q: "", a: "", hint: "Bei den Pflanzen" },
  { q: "", a: "", hint: "In der Werkzeugkiste" },
  { q: "", a: "", hint: "Auf dem Balkon" },
  { q: "", a: "", hint: "Unter dem Esstisch" },
  { q: "", a: "", hint: "In der Tasche neben dem Sofa" },
  { q: "", a: "", hint: "Zwischen den DVDs" },
  { q: "", a: "", hint: "Unter der Tastatur" },
  { q: "", a: "", hint: "In der Kamera-Tasche" },
  { q: "", a: "", hint: "Hinten am Schrank" },
  { q: "", a: "", hint: "In der Brotdose" },
  { q: "", a: "", hint: "Unter der Bettdecke" },
  { q: "Wie sagt man 'I love you' auf Deutsch?", a: "ich liebe dich", hint: "Großes Geschenk am 24. Dezember" }
];

// Option: setze testing = true, um Türen jederzeit freizuschalten (zum Testen)
const testing = false;

//////////////////////////
// Hilfsfunktionen
//////////////////////////

// Normierung: macht Text klein, entfernt Diakritika (Umlaute) und Leerzeichen
function normalizeAnswer(s) {
  if (s == null) return "";
  let t = String(s).toLowerCase().trim();

  // Versuche Unicode-Diakritika zu entfernen (moderner Browser)
  try {
    t = t.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch (e) {
    // Fallback: einfache Ersetzungen für Umlaute
    t = t
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");
  }

  // entferne alles außer Buchstaben und Zahlen (inkl. Umlaute nach Fallback)
  try {
    t = t.replace(/[^\p{L}\p{N}]+/gu, ""); // Unicode-freundlich
  } catch (e) {
    // fallback: einfacher regex für ASCII + deutsche Umlaute
    t = t.replace(/[^a-z0-9äöüß]+/gi, "");
  }

  return t;
}



const STORAGE_KEY = "advent-opened";

function loadOpenedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map(Number));
  } catch (e) {
    console.warn("Fehler beim Laden des Kalenderspeichers:", e);
    return new Set();
  }
}

function saveOpenedSet(set) {
  try {
    const arr = Array.from(set);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("Fehler beim Speichern des Kalenderspeichers:", e);
  }
}

const openedSet = loadOpenedSet(); // global set mit geöffneten Tagen

// Prüft, ob ein Tag freigeschaltet ist (Dezember-Regel)
function isAllowedToOpen(day) {
  if (testing) return true; // testing override
  const now = new Date();
  const month = now.getMonth(); // 0=Jan, 11=Dez
  const date = now.getDate();
  return (month === 11 && date >= day);
}

//////////////////////////
// DOM: Bau der Kalender
//////////////////////////

function buildCalendar() {
  const ol = document.getElementById("calendar");
  if (!ol) {
    console.error("Kein Element mit id='calendar' gefunden.");
    return;
  }

  // leeren (falls vorher existiert)
  ol.innerHTML = "";

  for (let i = 0; i < 24; i++) {
    const day = i + 1;
    const entry = entries[i] || { q: "", a: "", hint: "" };

    const li = document.createElement("li");
    li.classList.add(`day${day}`);


    // button.door ist semantisch korrekt für interaktive Fläche
    const btn = document.createElement("button");
    btn.className = "door";
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", `Tür ${day}`);
    btn.dataset.day = String(day);

    // closed-label (sichtbar bei hover; oder per :not(.open) verborgen)
    const closed = document.createElement("span");
    closed.className = "closed-label";

    // open-content (anfangs hidden; wird sichtbar wenn .open gesetzt)
    const open = document.createElement("span");
    open.className = "open-content";
    open.textContent = entry.hint || "Kein Hinweis";

    // setze initial display: open-content hidden (CSS kümmert sich, fallback hier)
    open.style.display = "none";

    // Anfügen
    btn.appendChild(closed);
    btn.appendChild(open);
    li.appendChild(btn);
    if (openedSet.has(day)) {
      btn.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      const openContent = btn.querySelector(".open-content");
      const closedLabel = btn.querySelector(".closed-label");
      if (openContent) openContent.style.display = "block";
      if (closedLabel) closedLabel.style.visibility = "hidden";
    }
    ol.appendChild(li);

    // Event: Klick
    btn.addEventListener("click", () => onDoorClick(btn, entry));
  }
}

//////////////////////////
// Klick-Handler
//////////////////////////

function onDoorClick(btn, entry) {
  const day = Number(btn.dataset.day);
  // check if allowed
  if (!isAllowedToOpen(day)) {
    // Für Benutzerfreundlichkeit: zeige Meldung, erlauben zum Test per confirm
    const ok = confirm(`Tür ${day} ist noch nicht freigegeben. Für Test freischalten?`);
    if (!ok) return;
  }

  // Wenn kein Rätsel gesetzt, öffnen wir sofort
  const q = (entry.q || "").trim();
  const a = (entry.a || "").trim();

  if (!q) {
    // Sofort öffnen (toggle)
    toggleOpen(btn);
    return;
  }

  // Frage stellen: prompt (einfach)
  const user = prompt(`Tür ${day}\n\n${q}\n\nDeine Antwort:`);
  if (user === null) return; // Abbrechen

  if (normalizeAnswer(user) === normalizeAnswer(a)) {
    // richtig
    alert("Richtig! Hier ist dein Hinweis.");
    toggleOpen(btn);
  } else {
    alert("Nicht korrekt — versuch's noch einmal!");
  }
}

function toggleOpen(btn) {
  const opened = btn.classList.toggle("open");
  btn.setAttribute("aria-expanded", opened ? "true" : "false");

  const openContent = btn.querySelector(".open-content");
  const closedLabel = btn.querySelector(".closed-label");
  if (openContent) openContent.style.display = opened ? "block" : "none";
  if (closedLabel) closedLabel.style.visibility = opened ? "hidden" : "visible";

  // persistieren: openedSet aktualisieren
  const day = Number(btn.dataset.day);
  if (opened) openedSet.add(day);
  else openedSet.delete(day);
  saveOpenedSet(openedSet);
}

//////////////////////////
// Init
//////////////////////////

document.addEventListener("DOMContentLoaded", () => {
  buildCalendar();

  // Optional: quick hotkey zum Testen: T toggled testing mode (nur lokal dev; comment-out in prod)
  // document.addEventListener('keydown', e => { if (e.key === 't') { testing = !testing; alert('testing=' + testing); }});
});
