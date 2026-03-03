/*
  Vier Gewinnt — Spiellogik

  Neue Konzepte:

  - 2D-ARRAY (zweidimensionales Array):
    Ein Array, das Arrays enthält — wie ein Gitter.

    Stell dir eine Tabelle vor:
         Spalte0  Spalte1  Spalte2
    Zeile0  [ 0,       0,       0 ]
    Zeile1  [ 0,       1,       0 ]
    Zeile2  [ 0,       2,       1 ]

    Zugriff: board[zeile][spalte]
    board[1][1] = 1 (Spieler 1 hat dort einen Stein)

  - VERSCHACHTELTE SCHLEIFE:
    Eine Schleife IN einer Schleife.
    Äußere Schleife = Zeilen, innere Schleife = Spalten.
    So gehen wir jede Zelle im Gitter durch.

  - GEWINN-PRÜFUNG:
    Wir prüfen in 4 Richtungen ob 4 gleiche Steine hintereinander liegen:
    → horizontal (—), vertikal (|), diagonal (↗), diagonal (↘)
*/

// ===== SCHRITT 1: Konstanten =====

const ROWS = 6;      // 6 Zeilen
const COLS = 7;      // 7 Spalten
const EMPTY = 0;     // 0 = leeres Feld
const PLAYER1 = 1;   // 1 = Spieler 1 (Rot)
const PLAYER2 = 2;   // 2 = Spieler 2 (Gelb)

// ===== SCHRITT 2: HTML-Elemente =====

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const newGameBtn = document.getElementById('newGameBtn');

// ===== SCHRITT 3: Spielvariablen =====

let board;            // Das 2D-Array (das Spielfeld)
let currentPlayer;    // Wer ist gerade dran? (1 oder 2)
let isGameOver;
let score1 = 0;
let score2 = 0;

// ===== SCHRITT 4: Spielfeld erstellen =====

function createBoard() {
    /*
      Wir erstellen ein 2D-Array:

      board = [
          [0, 0, 0, 0, 0, 0, 0],   ← Zeile 0 (oben)
          [0, 0, 0, 0, 0, 0, 0],   ← Zeile 1
          [0, 0, 0, 0, 0, 0, 0],   ← Zeile 2
          [0, 0, 0, 0, 0, 0, 0],   ← Zeile 3
          [0, 0, 0, 0, 0, 0, 0],   ← Zeile 4
          [0, 0, 0, 0, 0, 0, 0],   ← Zeile 5 (unten)
      ]
    */
    board = [];
    for (var r = 0; r < ROWS; r++) {
        // Für jede Zeile ein neues Array erstellen
        var row = [];
        for (var c = 0; c < COLS; c++) {
            // Jede Spalte in der Zeile mit EMPTY (0) füllen
            row.push(EMPTY);
            // push() fügt ein Element am Ende eines Arrays hinzu
        }
        board.push(row);
    }
}

// ===== SCHRITT 5: HTML-Spielfeld aufbauen =====

function renderBoard() {
    // Altes Brett leeren
    boardEl.innerHTML = '';

    // Jede Zelle als HTML-Element erstellen
    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            var cell = document.createElement('div');
            cell.className = 'cell';

            // data-Attribute setzen, damit wir beim Klick wissen
            // WELCHE Zelle geklickt wurde
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Klick-Event auf jede Zelle
            cell.addEventListener('click', onCellClick);

            boardEl.appendChild(cell);
        }
    }
}

// ===== SCHRITT 6: Eine Zelle anklicken =====

function onCellClick(e) {
    // e = Event-Objekt
    // e.target = das Element, das geklickt wurde
    if (isGameOver) return;

    // Spalte aus dem data-Attribut lesen
    var col = parseInt(e.target.dataset.col);

    // Stein in diese Spalte fallen lassen
    dropPiece(col);
}

// ===== SCHRITT 7: Stein fallen lassen (Gravitation!) =====

function dropPiece(col) {
    /*
      Wir suchen die UNTERSTE freie Zeile in dieser Spalte.
      Wir gehen von unten (Zeile 5) nach oben (Zeile 0).
      Die erste Zeile mit EMPTY = dort landet der Stein.
    */
    var landingRow = -1;
    // -1 = "noch nicht gefunden"

    for (var r = ROWS - 1; r >= 0; r--) {
        // ROWS - 1 = 5 (unterste Zeile)
        // r-- = eine Zeile nach oben
        // r >= 0 = bis zur obersten Zeile
        if (board[r][col] === EMPTY) {
            landingRow = r;
            break;
            // break = Schleife sofort abbrechen (wir haben die Zeile gefunden!)
        }
    }

    // Wenn keine freie Zeile → Spalte ist voll
    if (landingRow === -1) return;

    // Stein setzen im Daten-Array
    board[landingRow][col] = currentPlayer;

    // Stein visuell anzeigen
    updateCell(landingRow, col);

    // Prüfen ob jemand gewonnen hat
    var winCells = checkWin(landingRow, col);

    if (winCells) {
        // winCells = Array mit den 4 Gewinn-Positionen
        highlightWin(winCells);
        if (currentPlayer === PLAYER1) {
            score1++;
            score1El.textContent = score1;
            statusEl.textContent = '🎉 Spieler 1 (Rot) gewinnt!';
        } else {
            score2++;
            score2El.textContent = score2;
            statusEl.textContent = '🎉 Spieler 2 (Gelb) gewinnt!';
        }
        isGameOver = true;

    } else if (isBoardFull()) {
        // Kein Gewinner und Brett ist voll = Unentschieden
        statusEl.textContent = '🤝 Unentschieden!';
        isGameOver = true;

    } else {
        // Spieler wechseln
        switchPlayer();
    }
}

// ===== SCHRITT 8: Zelle visuell aktualisieren =====

function updateCell(row, col) {
    /*
      Wir müssen die richtige Zelle im HTML finden.
      Die Zellen sind in einer flachen Liste (nicht verschachtelt).
      Position = Zeile * Anzahl_Spalten + Spalte
      z.B. Zeile 2, Spalte 3 = 2 * 7 + 3 = 17 (das 17. Element)
    */
    var index = row * COLS + col;
    var cells = boardEl.querySelectorAll('.cell');
    var cell = cells[index];

    // CSS-Klasse für den Spieler setzen (für die Farbe)
    if (currentPlayer === PLAYER1) {
        cell.classList.add('player1');
    } else {
        cell.classList.add('player2');
    }

    // Drop-Animation auslösen
    cell.classList.add('drop');
}

// ===== SCHRITT 9: Spieler wechseln =====

function switchPlayer() {
    /*
      Ternärer Operator (Kurzform von if/else):
      bedingung ? wertWennTrue : wertWennFalse

      Wenn currentPlayer 1 ist → wird 2
      Wenn currentPlayer 2 ist → wird 1
    */
    currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;

    if (currentPlayer === PLAYER1) {
        statusEl.textContent = '🔴 Spieler 1 ist dran';
    } else {
        statusEl.textContent = '🟡 Spieler 2 ist dran';
    }
}

// ===== SCHRITT 10: Gewinn-Prüfung (das Herzstück!) =====

function checkWin(row, col) {
    /*
      Wir prüfen vom zuletzt gesetzten Stein aus in 4 Richtungen:

      1. Horizontal (—):  links ← und rechts →
      2. Vertikal (|):    oben ↑ und unten ↓
      3. Diagonal (↗):    links-unten ↙ und rechts-oben ↗
      4. Diagonal (↘):    links-oben ↖ und rechts-unten ↘

      Jede Richtung wird als Paar von (deltaRow, deltaCol) angegeben:
      z.B. horizontal: (0, 1) = gleiche Zeile, eine Spalte weiter
    */

    var directions = [
        [[0, -1], [0, 1]],     // Horizontal: links, rechts
        [[-1, 0], [1, 0]],     // Vertikal: oben, unten
        [[-1, -1], [1, 1]],    // Diagonal ↘: links-oben, rechts-unten
        [[-1, 1], [1, -1]]     // Diagonal ↗: rechts-oben, links-unten
    ];

    var player = board[row][col];

    for (var d = 0; d < directions.length; d++) {
        // Für jede der 4 Richtungen:
        var cells = [{ r: row, c: col }];
        // Startpunkt = der gerade gesetzte Stein

        // Zwei Richtungen pro Achse prüfen (z.B. links UND rechts)
        for (var dir = 0; dir < 2; dir++) {
            var dr = directions[d][dir][0];  // delta row (Zeilenverschiebung)
            var dc = directions[d][dir][1];  // delta col (Spaltenverschiebung)

            // In diese Richtung weitergehen, solange gleiche Steine
            var r = row + dr;
            var c = col + dc;

            while (
                r >= 0 && r < ROWS &&        // Noch innerhalb des Bretts (Zeile)
                c >= 0 && c < COLS &&        // Noch innerhalb des Bretts (Spalte)
                board[r][c] === player        // Gleicher Spieler
            ) {
                cells.push({ r: r, c: c });
                r += dr;  // Weiter in die Richtung
                c += dc;
            }
        }

        // 4 oder mehr gleiche Steine in einer Reihe?
        if (cells.length >= 4) {
            return cells;  // Gewonnen! Gib die Positionen zurück.
        }
    }

    return null;  // null = kein Gewinner
}

// ===== SCHRITT 11: Brett voll? =====

function isBoardFull() {
    // Wenn in der obersten Zeile kein leeres Feld mehr ist → Brett ist voll
    for (var c = 0; c < COLS; c++) {
        if (board[0][c] === EMPTY) {
            return false;  // Noch mindestens ein Platz frei
        }
    }
    return true;  // Alles voll
}

// ===== SCHRITT 12: Gewinn hervorheben =====

function highlightWin(winCells) {
    var allCells = boardEl.querySelectorAll('.cell');

    for (var i = 0; i < winCells.length; i++) {
        var index = winCells[i].r * COLS + winCells[i].c;
        allCells[index].classList.add('winning');
    }
}

// ===== SCHRITT 13: Neues Spiel =====

function startGame() {
    createBoard();
    renderBoard();
    currentPlayer = PLAYER1;
    isGameOver = false;
    statusEl.textContent = '🔴 Spieler 1 ist dran';
}

newGameBtn.addEventListener('click', startGame);

// Spiel starten!
startGame();
