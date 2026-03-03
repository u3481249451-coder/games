/*
  Stein-Schere-Papier — Spiellogik

  Neue Konzepte:
  - ARRAYS: Eine Liste → ['stein', 'schere', 'papier']
    Zugriff: liste[0] = erstes Element, liste[1] = zweites, usw.

  - OBJEKTE: Ein Behälter mit benannten Werten
    { stein: '🪨', schere: '✂️', papier: '📄' }
    Zugriff: objekt.stein oder objekt['stein']

  - querySelectorAll(): Findet ALLE Elemente, die zu einem CSS-Selektor passen
    (getElementById findet nur EINS)

  - forEach(): Führt eine Funktion für JEDES Element in einer Liste aus
*/

// ===== SCHRITT 1: Konstanten & Regeln =====

// Emojis für jede Wahl (Objekt = Nachschlage-Tabelle)
const EMOJIS = {
    stein: '🪨',
    schere: '✂️',
    papier: '📄'
};

// Wer schlägt wen? (Schlüssel schlägt Wert)
// Stein schlägt Schere, Schere schlägt Papier, Papier schlägt Stein
const BEATS = {
    stein: 'schere',     // Stein schlägt Schere
    schere: 'papier',    // Schere schlägt Papier
    papier: 'stein'      // Papier schlägt Stein
};

// Alle möglichen Wahlmöglichkeiten als Array (Liste)
const CHOICES = ['stein', 'schere', 'papier'];

// ===== SCHRITT 2: HTML-Elemente holen =====

const playerChoiceEl = document.getElementById('playerChoice');
const cpuChoiceEl = document.getElementById('cpuChoice');
const resultTextEl = document.getElementById('resultText');
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const historyEl = document.getElementById('history');
const newGameBtn = document.getElementById('newGameBtn');

// querySelectorAll() findet alle Elemente mit der Klasse .choice-btn
const choiceBtns = document.querySelectorAll('.choice-btn');
// querySelectorAll() findet alle Elemente mit der Klasse .mode-btn
const modeBtns = document.querySelectorAll('.mode-btn');

// ===== SCHRITT 3: Spielvariablen =====

let playerScore = 0;
let cpuScore = 0;
let mode = 'single';    // 'single' = Einzelrunde, 'bo5' = Best of 5
let roundNumber = 0;
let isPlaying = true;

// ===== SCHRITT 4: Modus wechseln =====

modeBtns.forEach(function (btn) {
    // forEach = für JEDEN Button in der Liste folgendes tun:
    btn.addEventListener('click', function () {
        // Alte active-Klasse entfernen
        modeBtns.forEach(function (b) {
            b.classList.remove('active');
        });
        // Neue active-Klasse setzen
        btn.classList.add('active');

        // data-mode Attribut auslesen
        // dataset = alle data-* Attribute eines Elements
        mode = btn.dataset.mode;

        // Spiel zurücksetzen bei Moduswechsel
        resetGame();
    });
});

// ===== SCHRITT 5: Spieler wählt =====

choiceBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
        if (!isPlaying) return;

        // data-choice Attribut auslesen (z.B. "stein", "schere", "papier")
        const playerChoice = btn.dataset.choice;

        // CPU wählt zufällig
        // Math.random() * 3 gibt 0, 1 oder 2
        // Math.floor() rundet ab
        // CHOICES[0] = 'stein', CHOICES[1] = 'schere', CHOICES[2] = 'papier'
        const cpuChoice = CHOICES[Math.floor(Math.random() * 3)];

        // Runde spielen
        playRound(playerChoice, cpuChoice);
    });
});

// ===== SCHRITT 6: Eine Runde spielen =====

function playRound(player, cpu) {
    roundNumber++;

    // Emojis anzeigen
    playerChoiceEl.textContent = EMOJIS[player];
    cpuChoiceEl.textContent = EMOJIS[cpu];

    // Pop-Animation: Klasse hinzufügen, kurz warten, wieder entfernen
    playerChoiceEl.classList.add('pop');
    cpuChoiceEl.classList.add('pop');
    setTimeout(function () {
        // setTimeout = "Warte X Millisekunden, dann führe diese Funktion aus"
        playerChoiceEl.classList.remove('pop');
        cpuChoiceEl.classList.remove('pop');
    }, 300);

    // Ergebnis bestimmen
    let result;

    if (player === cpu) {
        // Gleiche Wahl = Unentschieden
        result = 'draw';
        resultTextEl.textContent = 'Unentschieden!';
        resultTextEl.className = 'vs-text draw';
        // className setzt ALLE Klassen auf einmal (überschreibt alte)

    } else if (BEATS[player] === cpu) {
        // Spieler gewinnt! (z.B. player='stein', BEATS['stein']='schere', cpu='schere')
        result = 'win';
        playerScore++;
        playerScoreEl.textContent = playerScore;
        resultTextEl.textContent = 'Du gewinnst!';
        resultTextEl.className = 'vs-text win';

    } else {
        // CPU gewinnt
        result = 'lose';
        cpuScore++;
        cpuScoreEl.textContent = cpuScore;
        resultTextEl.textContent = 'CPU gewinnt!';
        resultTextEl.className = 'vs-text lose';
    }

    // Zum Verlauf hinzufügen
    addToHistory(roundNumber, result);

    // Im Best-of-5 Modus prüfen, ob jemand 3 Siege hat
    if (mode === 'bo5') {
        if (playerScore === 3) {
            endMatch('Du hast gewonnen! 🎉');
        } else if (cpuScore === 3) {
            endMatch('CPU hat gewonnen! 💻');
        }
    }
}

// ===== SCHRITT 7: Verlauf anzeigen =====

function addToHistory(round, result) {
    const tag = document.createElement('span');
    tag.className = 'round-tag ' + result;

    // Text je nach Ergebnis
    var labels = { win: 'W', lose: 'L', draw: 'D' };
    tag.textContent = 'R' + round + ' ' + labels[result];
    // z.B. "R1 W" = Runde 1, Win

    historyEl.appendChild(tag);
}

// ===== SCHRITT 8: Match beenden (Best of 5) =====

function endMatch(message) {
    isPlaying = false;
    resultTextEl.textContent = message;
    resultTextEl.className = 'vs-text';

    // Buttons deaktivieren
    choiceBtns.forEach(function (btn) {
        btn.disabled = true;
        // disabled = true → Button ist ausgegraut und nicht klickbar
    });

    newGameBtn.classList.remove('hidden');
}

// ===== SCHRITT 9: Neues Spiel =====

function resetGame() {
    playerScore = 0;
    cpuScore = 0;
    roundNumber = 0;
    isPlaying = true;

    playerScoreEl.textContent = '0';
    cpuScoreEl.textContent = '0';
    playerChoiceEl.textContent = '❓';
    cpuChoiceEl.textContent = '❓';
    resultTextEl.textContent = 'Wähle!';
    resultTextEl.className = 'vs-text';
    historyEl.innerHTML = '';
    newGameBtn.classList.add('hidden');

    choiceBtns.forEach(function (btn) {
        btn.disabled = false;
    });
}

newGameBtn.addEventListener('click', resetGame);
