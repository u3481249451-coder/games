/*
  JavaScript = die Programmiersprache, die das Spiel zum Leben erweckt.

  Grundkonzepte die wir hier nutzen:

  - VARIABLEN: Speichern Werte (wie Boxen mit Etiketten)
    let  = kann sich ändern    → let score = 0;
    const = bleibt gleich      → const maxZahl = 100;

  - FUNKTIONEN: Wiederverwendbare Aktionen (wie Rezepte)
    function raten() { ... }

  - IF/ELSE: Entscheidungen treffen
    if (zahl > geheim) { "zu hoch" } else { "zu niedrig" }

  - EVENTS: Reagieren auf Nutzer-Aktionen (Klick, Tastendruck)
*/

// ===== SCHRITT 1: HTML-Elemente holen =====
// document.getElementById() sucht ein Element anhand seiner ID im HTML

const messageEl = document.getElementById('message');       // Der Hinweistext
const inputEl = document.getElementById('guessInput');       // Das Eingabefeld
const guessBtn = document.getElementById('guessBtn');        // Der "Raten" Button
const attemptsEl = document.getElementById('attempts');      // Anzeige: Anzahl Versuche
const recordEl = document.getElementById('record');          // Anzeige: Rekord
const historyEl = document.getElementById('history');        // Bereich für bisherige Versuche
const newGameBtn = document.getElementById('newGameBtn');    // "Neues Spiel" Button

// ===== SCHRITT 2: Spielvariablen =====

let secretNumber;    // Die geheime Zahl, die der Spieler erraten muss
let attempts;        // Wie viele Versuche der Spieler gebraucht hat
let gameOver;        // Ist das Spiel vorbei? (true/false = ja/nein)

// Rekord aus dem Speicher laden (localStorage = bleibt auch nach Browser-Schließen)
let record = parseInt(localStorage.getItem('zahlenratenRecord')) || 0;
// parseInt() wandelt Text in eine Zahl um
// || 0 bedeutet: Falls nichts gespeichert ist, nimm 0
recordEl.textContent = record || '-';

// ===== SCHRITT 3: Neues Spiel starten =====

function startGame() {
    // Math.random() gibt eine Zufallszahl zwischen 0 und 1 (z.B. 0.7382)
    // * 100 macht daraus 0 bis 100 (z.B. 73.82)
    // Math.floor() rundet ab (z.B. 73)
    // + 1 damit wir 1-100 statt 0-99 bekommen
    secretNumber = Math.floor(Math.random() * 100) + 1;

    attempts = 0;
    gameOver = false;

    // Alles zurücksetzen
    messageEl.textContent = 'Ich denke an eine Zahl zwischen 1 und 100. Rate!';
    attemptsEl.textContent = '0';
    historyEl.innerHTML = '';           // Verlauf leeren (innerHTML = der HTML-Inhalt)
    inputEl.value = '';                 // Eingabefeld leeren
    inputEl.disabled = false;           // Eingabefeld aktivieren
    guessBtn.disabled = false;          // Button aktivieren
    newGameBtn.classList.add('hidden'); // "Neues Spiel" verstecken
    // classList = Liste aller CSS-Klassen eines Elements
    // .add('hidden') fügt die Klasse "hidden" hinzu → Element verschwindet

    inputEl.focus();                    // Cursor ins Eingabefeld setzen
}

// ===== SCHRITT 4: Einen Versuch auswerten =====

function makeGuess() {
    // Wenn das Spiel vorbei ist, nichts tun
    if (gameOver) return;
    // return = Funktion sofort beenden

    // Eingabe lesen und in eine Zahl umwandeln
    const guess = parseInt(inputEl.value);

    // Prüfen ob die Eingabe gültig ist
    if (isNaN(guess) || guess < 1 || guess > 100) {
        // isNaN = "is Not a Number" = ist keine Zahl?
        messageEl.textContent = 'Bitte gib eine Zahl zwischen 1 und 100 ein!';
        return;
    }

    // Versuch zählen
    attempts++;
    attemptsEl.textContent = attempts;

    // Eingabefeld leeren für den nächsten Versuch
    inputEl.value = '';
    inputEl.focus();

    // ===== Die eigentliche Logik: Vergleichen! =====

    if (guess === secretNumber) {
        // === bedeutet "ist exakt gleich" (3 Gleichheitszeichen = strenger Vergleich)

        messageEl.textContent = '🎉 Richtig! Die Zahl war ' + secretNumber + '! (' + attempts + ' Versuche)';
        addToHistory(guess, 'correct');
        endGame();

    } else if (guess < secretNumber) {
        // Die geratene Zahl ist kleiner als die geheime Zahl

        messageEl.textContent = '⬆️ Zu niedrig! Versuch es höher.';
        addToHistory(guess, 'too-low');

    } else {
        // Die geratene Zahl ist größer als die geheime Zahl

        messageEl.textContent = '⬇️ Zu hoch! Versuch es niedriger.';
        addToHistory(guess, 'too-high');
    }
}

// ===== SCHRITT 5: Versuch zum Verlauf hinzufügen =====

function addToHistory(number, type) {
    // Ein neues HTML-Element erstellen
    const tag = document.createElement('span');
    // createElement() erzeugt ein neues Element (hier: <span>)

    tag.textContent = number;
    // Der Text im Element = die geratene Zahl

    tag.className = 'guess-tag ' + type;
    // className setzt die CSS-Klassen (für die Farbe: too-low, too-high, correct)

    historyEl.appendChild(tag);
    // appendChild() hängt das neue Element an den Verlauf-Bereich an
}

// ===== SCHRITT 6: Spiel beenden =====

function endGame() {
    gameOver = true;
    inputEl.disabled = true;          // Eingabe sperren
    guessBtn.disabled = true;         // Button sperren
    newGameBtn.classList.remove('hidden');  // "Neues Spiel" anzeigen
    // .remove('hidden') entfernt die Klasse → Element wird sichtbar

    // Neuen Rekord prüfen
    if (record === 0 || attempts < record) {
        // Erster Gewinn (record === 0) ODER weniger Versuche als der Rekord
        record = attempts;
        localStorage.setItem('zahlenratenRecord', record);
        // localStorage.setItem() speichert einen Wert dauerhaft im Browser
        recordEl.textContent = record;
    }
}

// ===== SCHRITT 7: Events = Auf Nutzer reagieren =====

// Wenn der "Raten" Button geklickt wird → makeGuess() aufrufen
guessBtn.addEventListener('click', makeGuess);
// addEventListener('click', ...) = "Wenn jemand klickt, führe diese Funktion aus"

// Wenn Enter gedrückt wird → auch raten
inputEl.addEventListener('keydown', function (e) {
    // keydown = eine Taste wurde gedrückt
    // e = das Event-Objekt (enthält Infos über die gedrückte Taste)
    if (e.key === 'Enter') {
        makeGuess();
    }
});

// "Neues Spiel" Button
newGameBtn.addEventListener('click', startGame);

// ===== SCHRITT 8: Spiel beim Laden der Seite starten =====
startGame();
