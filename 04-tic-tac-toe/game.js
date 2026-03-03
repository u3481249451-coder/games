/*
  Tic-Tac-Toe — mit CPU-Gegner (Leicht + Schwer)

  Neues Konzept — MINIMAX-ALGORITHMUS:
  ====================================
  Minimax ist ein Algorithmus für Zwei-Spieler-Spiele.
  Er denkt ALLE möglichen Züge durch bis zum Ende.

  Stell dir einen Baum vor:
  - Jeder Ast = ein möglicher Zug
  - Jedes Blatt = ein Endergebnis (Gewinn, Verlust, Unentschieden)

  Der Algorithmus:
  1. CPU macht einen Zug (und gibt sich Punkte für gute Ergebnisse)
  2. Dann simuliert sie den besten Spieler-Zug (der ihr schadet)
  3. Dann wieder den besten CPU-Zug... usw.
  4. Am Ende wählt sie den Zug mit dem besten Ergebnis

  Ergebnis: Die CPU spielt PERFEKT und ist unschlagbar!
  (Im schweren Modus — im leichten wählt sie zufällig)

  Weiteres neues Konzept — REKURSION:
  ====================================
  Eine Funktion, die SICH SELBST aufruft.
  Wie ein Spiegel im Spiegel — sie geht immer tiefer,
  bis sie ein Endergebnis findet, und arbeitet sich dann zurück.
*/

// ===== SCHRITT 1: Konstanten =====

var X = 'X';
var O = 'O';
var EMPTY = '';

// Alle 8 möglichen Gewinn-Kombinationen (Indizes 0-8):
// Zeilen, Spalten, Diagonalen
var WIN_COMBOS = [
    [0, 1, 2],   // obere Zeile
    [3, 4, 5],   // mittlere Zeile
    [6, 7, 8],   // untere Zeile
    [0, 3, 6],   // linke Spalte
    [1, 4, 7],   // mittlere Spalte
    [2, 5, 8],   // rechte Spalte
    [0, 4, 8],   // Diagonale ↘
    [2, 4, 6]    // Diagonale ↗
];

// ===== SCHRITT 2: HTML-Elemente =====

var cells = document.querySelectorAll('.cell');
var statusEl = document.getElementById('status');
var scoreXEl = document.getElementById('scoreX');
var scoreOEl = document.getElementById('scoreO');
var scoreDrawEl = document.getElementById('scoreDraw');
var difficultyEl = document.getElementById('difficulty');
var modeBtns = document.querySelectorAll('.mode-btn');
var diffBtns = document.querySelectorAll('.diff-btn');
var newGameBtn = document.getElementById('newGameBtn');

// ===== SCHRITT 3: Spielvariablen =====

var board;                // Array mit 9 Feldern
var currentPlayer;        // Wer ist dran? ('X' oder 'O')
var isGameOver;
var mode = 'cpu';         // 'cpu' oder 'local'
var difficulty = 'easy';  // 'easy' oder 'hard'
var scoreX = 0;
var scoreO = 0;
var scoreDraw = 0;

// ===== SCHRITT 4: Modus & Schwierigkeit =====

modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
        modeBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        mode = btn.dataset.mode;

        // Schwierigkeit nur bei CPU-Modus anzeigen
        if (mode === 'cpu') {
            difficultyEl.classList.remove('hidden');
        } else {
            difficultyEl.classList.add('hidden');
        }
        startGame();
    });
});

diffBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
        diffBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        startGame();
    });
});

// ===== SCHRITT 5: Spiel starten =====

function startGame() {
    // Board = Array mit 9 leeren Feldern
    board = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
    currentPlayer = X;
    isGameOver = false;
    statusEl.textContent = '❌ ' + (mode === 'cpu' ? 'Du bist' : 'Spieler X ist') + ' dran';

    // Alle Zellen zurücksetzen
    cells.forEach(function (cell) {
        cell.textContent = '';
        cell.className = 'cell';
        // className komplett neu setzen = alle alten Klassen entfernen
    });
}

// ===== SCHRITT 6: Klick auf eine Zelle =====

cells.forEach(function (cell) {
    cell.addEventListener('click', function () {
        if (isGameOver) return;

        var index = parseInt(cell.dataset.index);

        // Feld schon belegt?
        if (board[index] !== EMPTY) return;

        // Im CPU-Modus: Spieler darf nur als X spielen
        if (mode === 'cpu' && currentPlayer !== X) return;

        // Zug machen
        makeMove(index);

        // CPU ist dran (nach kurzem Warten, damit es natürlicher wirkt)
        if (mode === 'cpu' && !isGameOver) {
            setTimeout(cpuMove, 300);
        }
    });
});

// ===== SCHRITT 7: Einen Zug machen =====

function makeMove(index) {
    // Stein setzen
    board[index] = currentPlayer;

    // Visuell anzeigen
    var cell = cells[index];
    cell.textContent = currentPlayer;
    cell.classList.add('taken', 'placed');
    cell.classList.add(currentPlayer === X ? 'x' : 'o');
    // Setzt 'x' oder 'o' als CSS-Klasse (für die Farbe)

    // Gewinn prüfen
    var winCombo = checkWin(currentPlayer);

    if (winCombo) {
        // winCombo = z.B. [0, 1, 2] (die Gewinn-Indizes)
        highlightWin(winCombo);

        if (currentPlayer === X) {
            scoreX++;
            scoreXEl.textContent = scoreX;
            statusEl.textContent = '🎉 ' + (mode === 'cpu' ? 'Du hast' : 'Spieler X hat') + ' gewonnen!';
        } else {
            scoreO++;
            scoreOEl.textContent = scoreO;
            statusEl.textContent = '🎉 ' + (mode === 'cpu' ? 'CPU hat' : 'Spieler O hat') + ' gewonnen!';
        }
        isGameOver = true;

    } else if (isBoardFull()) {
        scoreDraw++;
        scoreDrawEl.textContent = scoreDraw;
        statusEl.textContent = '🤝 Unentschieden!';
        isGameOver = true;

    } else {
        // Spieler wechseln
        currentPlayer = currentPlayer === X ? O : X;

        if (mode === 'local') {
            statusEl.textContent = (currentPlayer === X ? '❌' : '⭕') + ' Spieler ' + currentPlayer + ' ist dran';
        } else {
            statusEl.textContent = currentPlayer === X ? '❌ Du bist dran' : '⭕ CPU denkt...';
        }
    }
}

// ===== SCHRITT 8: Gewinn prüfen =====

function checkWin(player) {
    // Jede der 8 Gewinn-Kombinationen durchgehen
    for (var i = 0; i < WIN_COMBOS.length; i++) {
        var combo = WIN_COMBOS[i];
        var a = combo[0];
        var b = combo[1];
        var c = combo[2];

        // Alle 3 Felder müssen dem gleichen Spieler gehören
        if (board[a] === player && board[b] === player && board[c] === player) {
            return combo;  // Gewonnen! Gib die Kombination zurück.
        }
    }
    return null;  // Kein Gewinn
}

function isBoardFull() {
    // .every() prüft ob JEDES Element eine Bedingung erfüllt
    // Gibt true zurück wenn ALLE Felder belegt sind
    return board.every(function (cell) {
        return cell !== EMPTY;
    });
}

function highlightWin(combo) {
    combo.forEach(function (index) {
        cells[index].classList.add('winning');
    });
}

// ===== SCHRITT 9: CPU-ZUG =====

function cpuMove() {
    if (isGameOver) return;

    var move;

    if (difficulty === 'easy') {
        // LEICHT: Zufälligen freien Platz wählen
        move = getRandomMove();
    } else {
        // SCHWER: Minimax-Algorithmus (unschlagbar!)
        move = getBestMove();
    }

    if (move !== -1) {
        makeMove(move);
    }
}

// ===== SCHRITT 10: Zufälliger Zug (Leicht) =====

function getRandomMove() {
    // Alle freien Felder finden
    var emptyFields = [];

    for (var i = 0; i < board.length; i++) {
        if (board[i] === EMPTY) {
            emptyFields.push(i);
            // push() = ans Ende der Liste hinzufügen
        }
    }

    if (emptyFields.length === 0) return -1;

    // Zufällig eines auswählen
    var randomIndex = Math.floor(Math.random() * emptyFields.length);
    return emptyFields[randomIndex];
}

// ===== SCHRITT 11: MINIMAX-ALGORITHMUS (Schwer) =====

/*
  Das ist der komplexeste Teil — aber das Prinzip ist einfach:

  Die CPU fragt sich: "Was passiert, wenn ich HIER setze?"
  Dann fragt sie: "Was macht der Spieler dann am besten?"
  Dann: "Was mache ICH dann am besten?"
  ...und so weiter, bis das Spiel zu Ende ist.

  Bewertung:
  +10 = CPU (O) gewinnt  → GUT für CPU
   -10 = Spieler (X) gewinnt → SCHLECHT für CPU
    0 = Unentschieden   → NEUTRAL

  Die CPU wählt den Zug mit der HÖCHSTEN Bewertung.
  Der Spieler wählt (in der Simulation) den mit der NIEDRIGSTEN.
  Deshalb "Minimax" — der eine MINImiert, der andere MAXimiert.
*/

function getBestMove() {
    var bestScore = -Infinity;
    // -Infinity = der kleinstmögliche Wert (alles ist besser)
    var bestMove = -1;

    // Jeden möglichen Zug durchprobieren
    for (var i = 0; i < board.length; i++) {
        if (board[i] !== EMPTY) continue;
        // continue = diesen Durchlauf überspringen, zum nächsten gehen

        // Zug simulieren (temporär setzen)
        board[i] = O;

        // Minimax aufrufen — jetzt ist der Spieler (X) dran
        // false = "es ist NICHT der maximierende Spieler dran"
        var score = minimax(board, false);

        // Zug rückgängig machen
        board[i] = EMPTY;

        // Bisher bester Zug?
        if (score > bestScore) {
            bestScore = score;
            bestMove = i;
        }
    }

    return bestMove;
}

function minimax(boardState, isMaximizing) {
    /*
      REKURSION: Diese Funktion ruft sich selbst auf!

      isMaximizing = true  → CPU (O) ist dran, will HOHEN Score
      isMaximizing = false → Spieler (X) ist dran, will NIEDRIGEN Score
    */

    // Basisfall: Spiel ist zu Ende → Bewertung zurückgeben
    if (checkWin(O)) return 10;     // CPU gewinnt = +10
    if (checkWin(X)) return -10;    // Spieler gewinnt = -10
    if (isBoardFull()) return 0;    // Unentschieden = 0

    if (isMaximizing) {
        // CPU (O) ist dran — will den HÖCHSTEN Score
        var best = -Infinity;

        for (var i = 0; i < boardState.length; i++) {
            if (boardState[i] !== EMPTY) continue;

            boardState[i] = O;                          // Zug simulieren
            var score = minimax(boardState, false);     // Spieler ist als nächstes dran
            boardState[i] = EMPTY;                      // Rückgängig machen

            if (score > best) best = score;
        }
        return best;

    } else {
        // Spieler (X) ist dran — will den NIEDRIGSTEN Score
        var best = Infinity;
        // Infinity = der größtmögliche Wert (alles ist kleiner)

        for (var i = 0; i < boardState.length; i++) {
            if (boardState[i] !== EMPTY) continue;

            boardState[i] = X;                          // Zug simulieren
            var score = minimax(boardState, true);      // CPU ist als nächstes dran
            boardState[i] = EMPTY;                      // Rückgängig machen

            if (score < best) best = score;
        }
        return best;
    }
}

// ===== SCHRITT 12: Neues Spiel =====

newGameBtn.addEventListener('click', startGame);

// Spiel starten!
startGame();
