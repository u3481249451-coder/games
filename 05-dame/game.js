/*
  Dame (Checkers) — Spiellogik

  Neue Konzepte:

  - SPIELZUSTAND-MANAGEMENT:
    Das Spiel hat verschiedene Phasen:
    1. Stein auswählen → gültige Züge berechnen & anzeigen
    2. Zielfeld anklicken → Stein bewegen
    3. Schlagzwang prüfen → Mehrfachsprung möglich?
    4. Spieler wechseln

  - GÜLTIGE ZÜGE BERECHNEN:
    Für jeden Stein prüfen wir diagonal:
    - Normaler Zug: Ein Feld diagonal vorwärts (leer?)
    - Sprung: Zwei Felder diagonal, gegnerischer Stein dazwischen?
    - Dame: Darf auch rückwärts!

  - SCHLAGZWANG:
    Wenn ein Spieler schlagen kann, MUSS er schlagen.
    Wir prüfen zuerst ob Sprünge möglich sind.
    Wenn ja, sind nur Sprünge erlaubt (keine normalen Züge).
*/

// ===== SCHRITT 1: Konstanten =====

var ROWS = 8;
var COLS = 8;
var EMPTY = 0;
var RED = 1;        // Spieler 1 (bewegt sich nach oben)
var BLACK = 2;      // Spieler 2 (bewegt sich nach unten)
var RED_KING = 3;   // Rote Dame
var BLACK_KING = 4; // Schwarze Dame

// ===== SCHRITT 2: HTML-Elemente =====

var boardEl = document.getElementById('board');
var statusEl = document.getElementById('status');
var scoreRedEl = document.getElementById('scoreRed');
var scoreBlackEl = document.getElementById('scoreBlack');
var newGameBtn = document.getElementById('newGameBtn');

// ===== SCHRITT 3: Spielvariablen =====

var board;              // 2D-Array (8×8)
var currentPlayer;      // RED oder BLACK
var selectedPiece;      // { row, col } des ausgewählten Steins
var validMoves;         // Liste der gültigen Züge für den ausgewählten Stein
var mustJump;           // Muss der aktuelle Spieler springen? (Schlagzwang)
var multiJumpPiece;     // Stein der gerade einen Mehrfachsprung macht
var isGameOver;

// ===== SCHRITT 4: Hilfsfunktionen =====

// Prüft ob ein Wert zu einem Spieler gehört
function belongsTo(value, player) {
    /*
      Rot = 1 (normal) oder 3 (Dame)
      Schwarz = 2 (normal) oder 4 (Dame)

      Statt einzeln zu prüfen nutzen wir einen Trick:
      Rot: 1 und 3 → wenn wir prüfen: value === 1 || value === 3
      Schwarz: 2 und 4 → value === 2 || value === 4
    */
    if (player === RED) return value === RED || value === RED_KING;
    return value === BLACK || value === BLACK_KING;
}

// Ist der Stein eine Dame?
function isKing(value) {
    return value === RED_KING || value === BLACK_KING;
}

// Gegnerischer Spieler
function opponent(player) {
    return player === RED ? BLACK : RED;
}

// ===== SCHRITT 5: Spielfeld erstellen =====

function createBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) {
        var row = [];
        for (var c = 0; c < COLS; c++) {
            /*
              Dame-Aufstellung:
              - Steine stehen nur auf dunklen Feldern
              - Dunkle Felder = Zeile + Spalte ist ungerade
                (z.B. Zeile 0, Spalte 1 → 0+1=1 → ungerade → dunkel)
              - Reihe 0-2: Schwarz (oben)
              - Reihe 5-7: Rot (unten)
              - Reihe 3-4: leer (Mitte)
            */
            if ((r + c) % 2 === 1) {
                // % = Modulo (Rest der Division). Ungerade Summe = dunkles Feld
                if (r < 3) {
                    row.push(BLACK);
                } else if (r > 4) {
                    row.push(RED);
                } else {
                    row.push(EMPTY);
                }
            } else {
                row.push(EMPTY); // Helles Feld = immer leer
            }
        }
        board.push(row);
    }
}

// ===== SCHRITT 6: Brett anzeigen =====

function renderBoard() {
    boardEl.innerHTML = '';

    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            var cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Helles oder dunkles Feld?
            if ((r + c) % 2 === 0) {
                cell.classList.add('light');
            } else {
                cell.classList.add('dark');
            }

            // Spielstein auf dem Feld?
            var piece = board[r][c];
            if (piece !== EMPTY) {
                var pieceEl = document.createElement('div');
                pieceEl.className = 'piece';

                if (belongsTo(piece, RED)) {
                    pieceEl.classList.add('red');
                } else {
                    pieceEl.classList.add('black');
                }

                if (isKing(piece)) {
                    pieceEl.classList.add('king');
                }

                cell.appendChild(pieceEl);
            }

            // Klick-Event
            cell.addEventListener('click', onCellClick);

            boardEl.appendChild(cell);
        }
    }

    // Gültige Züge markieren
    if (validMoves) {
        markValidMoves();
    }

    // Ausgewählten Stein markieren
    if (selectedPiece) {
        var index = selectedPiece.row * COLS + selectedPiece.col;
        var selectedCell = boardEl.children[index];
        var pieceInCell = selectedCell.querySelector('.piece');
        if (pieceInCell) {
            pieceInCell.classList.add('selected');
        }
    }
}

// ===== SCHRITT 7: Gültige Züge markieren =====

function markValidMoves() {
    for (var i = 0; i < validMoves.length; i++) {
        var move = validMoves[i];
        var index = move.toRow * COLS + move.toCol;
        var cell = boardEl.children[index];

        if (move.captured) {
            cell.classList.add('valid-capture');
        } else {
            cell.classList.add('valid-move');
        }
    }
}

// ===== SCHRITT 8: Gültige Züge berechnen =====

function getMovesForPiece(row, col) {
    /*
      Ein Stein kann sich diagonal bewegen.
      Wir prüfen 4 diagonale Richtungen:
      [-1,-1] = oben-links    [-1,+1] = oben-rechts
      [+1,-1] = unten-links   [+1,+1] = unten-rechts

      Normale Steine:
      - Rot bewegt sich nach OBEN (Richtung -1)
      - Schwarz bewegt sich nach UNTEN (Richtung +1)

      Damen dürfen in ALLE 4 Richtungen.
    */
    var piece = board[row][col];
    var moves = [];

    // Welche Richtungen darf der Stein?
    var directions = [];

    if (isKing(piece)) {
        // Dame: alle 4 Richtungen
        directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    } else if (belongsTo(piece, RED)) {
        // Rot: nach oben
        directions = [[-1, -1], [-1, 1]];
    } else {
        // Schwarz: nach unten
        directions = [[1, -1], [1, 1]];
    }

    var player = belongsTo(piece, RED) ? RED : BLACK;
    var opp = opponent(player);

    for (var d = 0; d < directions.length; d++) {
        var dr = directions[d][0]; // delta row
        var dc = directions[d][1]; // delta col

        var newRow = row + dr;
        var newCol = col + dc;

        // Ist das Zielfeld auf dem Brett?
        if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) continue;

        if (board[newRow][newCol] === EMPTY) {
            // Normaler Zug: ein Feld diagonal, Ziel ist leer
            moves.push({
                toRow: newRow,
                toCol: newCol,
                captured: null  // null = kein Sprung
            });

        } else if (belongsTo(board[newRow][newCol], opp)) {
            // Gegnerischer Stein im Weg → Sprung prüfen!
            var jumpRow = newRow + dr;
            var jumpCol = newCol + dc;

            // Ist das Feld HINTER dem Gegner frei und auf dem Brett?
            if (jumpRow >= 0 && jumpRow < ROWS &&
                jumpCol >= 0 && jumpCol < COLS &&
                board[jumpRow][jumpCol] === EMPTY) {

                moves.push({
                    toRow: jumpRow,
                    toCol: jumpCol,
                    captured: { row: newRow, col: newCol }
                    // captured = Position des geschlagenen Steins
                });
            }
        }
    }

    return moves;
}

// ===== SCHRITT 9: Schlagzwang prüfen =====

function hasAnyJumps(player) {
    /*
      Geht alle Steine des Spielers durch.
      Wenn IRGENDEINER springen kann → Schlagzwang!
    */
    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            if (!belongsTo(board[r][c], player)) continue;

            var moves = getMovesForPiece(r, c);
            for (var i = 0; i < moves.length; i++) {
                if (moves[i].captured) return true; // Sprung möglich!
            }
        }
    }
    return false;
}

function hasAnyMoves(player) {
    // Prüft ob der Spieler ÜBERHAUPT noch ziehen kann
    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            if (!belongsTo(board[r][c], player)) continue;
            if (getMovesForPiece(r, c).length > 0) return true;
        }
    }
    return false;
}

// ===== SCHRITT 10: Klick auf ein Feld =====

function onCellClick(e) {
    if (isGameOver) return;

    // Finde die Zelle (klick könnte auf dem Stein oder der Zelle sein)
    var cell = e.target;
    if (cell.classList.contains('piece')) {
        cell = cell.parentElement;
        // parentElement = das Eltern-Element (die Zelle die den Stein enthält)
    }

    var row = parseInt(cell.dataset.row);
    var col = parseInt(cell.dataset.col);

    // Bei Mehrfachsprung: Nur der springende Stein darf bewegt werden
    if (multiJumpPiece) {
        handleMultiJump(row, col);
        return;
    }

    // Ist auf dem geklickten Feld ein eigener Stein?
    if (belongsTo(board[row][col], currentPlayer)) {
        selectPiece(row, col);
    } else if (selectedPiece && isValidMove(row, col)) {
        // Ein Stein ist ausgewählt UND das Ziel ist ein gültiger Zug
        executeMove(row, col);
    }
}

// ===== SCHRITT 11: Stein auswählen =====

function selectPiece(row, col) {
    // Alle Züge für diesen Stein berechnen
    var moves = getMovesForPiece(row, col);

    // Schlagzwang: Wenn Sprünge möglich sind, nur Sprünge erlauben
    mustJump = hasAnyJumps(currentPlayer);

    if (mustJump) {
        // Nur Sprung-Züge behalten (filter)
        var jumpMoves = [];
        for (var i = 0; i < moves.length; i++) {
            if (moves[i].captured) jumpMoves.push(moves[i]);
        }
        moves = jumpMoves;

        // Wenn dieser Stein keine Sprünge hat → nicht auswählbar
        if (moves.length === 0) return;
    }

    if (moves.length === 0) return;

    selectedPiece = { row: row, col: col };
    validMoves = moves;
    renderBoard();
}

// ===== SCHRITT 12: Ist das Zielfeld ein gültiger Zug? =====

function isValidMove(row, col) {
    if (!validMoves) return false;
    for (var i = 0; i < validMoves.length; i++) {
        if (validMoves[i].toRow === row && validMoves[i].toCol === col) {
            return true;
        }
    }
    return false;
}

// Findet den passenden Zug für ein Zielfeld
function findMove(row, col) {
    for (var i = 0; i < validMoves.length; i++) {
        if (validMoves[i].toRow === row && validMoves[i].toCol === col) {
            return validMoves[i];
        }
    }
    return null;
}

// ===== SCHRITT 13: Zug ausführen =====

function executeMove(toRow, toCol) {
    var move = findMove(toRow, toCol);
    if (!move) return;

    var fromRow = selectedPiece.row;
    var fromCol = selectedPiece.col;

    // Stein bewegen (im Daten-Array)
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = EMPTY;

    // Geschlagenen Stein entfernen
    if (move.captured) {
        board[move.captured.row][move.captured.col] = EMPTY;
    }

    // Dame-Verwandlung prüfen
    promoteIfNeeded(toRow, toCol);

    // Steine zählen und anzeigen
    updateScores();

    // Gewinner prüfen
    if (checkGameEnd()) return;

    // Mehrfachsprung prüfen: Nach einem Sprung nochmal springen?
    if (move.captured) {
        var nextJumps = getJumpsFrom(toRow, toCol);
        if (nextJumps.length > 0) {
            // Mehrfachsprung! Der Stein muss weiter springen.
            multiJumpPiece = { row: toRow, col: toCol };
            selectedPiece = { row: toRow, col: toCol };
            validMoves = nextJumps;
            renderBoard();
            return;
        }
    }

    // Zug fertig → Spieler wechseln
    endTurn();
}

// ===== SCHRITT 14: Mehrfachsprung =====

function handleMultiJump(row, col) {
    if (isValidMove(row, col)) {
        executeMove(row, col);
    }
}

// Findet Sprünge VON einer bestimmten Position
function getJumpsFrom(row, col) {
    var moves = getMovesForPiece(row, col);
    var jumps = [];
    for (var i = 0; i < moves.length; i++) {
        if (moves[i].captured) jumps.push(moves[i]);
    }
    return jumps;
}

// ===== SCHRITT 15: Dame-Verwandlung =====

function promoteIfNeeded(row, col) {
    /*
      Rot bewegt sich nach oben → wird Dame wenn Zeile 0 erreicht
      Schwarz bewegt sich nach unten → wird Dame wenn Zeile 7 erreicht
    */
    if (board[row][col] === RED && row === 0) {
        board[row][col] = RED_KING;
    }
    if (board[row][col] === BLACK && row === 7) {
        board[row][col] = BLACK_KING;
    }
}

// ===== SCHRITT 16: Zug beenden & Spieler wechseln =====

function endTurn() {
    selectedPiece = null;
    validMoves = null;
    multiJumpPiece = null;
    currentPlayer = opponent(currentPlayer);

    if (currentPlayer === RED) {
        statusEl.textContent = '🔴 Rot ist dran';
    } else {
        statusEl.textContent = '⚫ Schwarz ist dran';
    }

    renderBoard();
}

// ===== SCHRITT 17: Steine zählen =====

function updateScores() {
    var redCount = 0;
    var blackCount = 0;

    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            if (belongsTo(board[r][c], RED)) redCount++;
            if (belongsTo(board[r][c], BLACK)) blackCount++;
        }
    }

    scoreRedEl.textContent = redCount;
    scoreBlackEl.textContent = blackCount;
}

// ===== SCHRITT 18: Spielende prüfen =====

function checkGameEnd() {
    var redCount = 0;
    var blackCount = 0;

    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            if (belongsTo(board[r][c], RED)) redCount++;
            if (belongsTo(board[r][c], BLACK)) blackCount++;
        }
    }

    if (redCount === 0) {
        statusEl.textContent = '🎉 Schwarz gewinnt!';
        isGameOver = true;
        return true;
    }
    if (blackCount === 0) {
        statusEl.textContent = '🎉 Rot gewinnt!';
        isGameOver = true;
        return true;
    }

    // Kann der nächste Spieler noch ziehen?
    var nextPlayer = opponent(currentPlayer);
    if (!hasAnyMoves(nextPlayer)) {
        if (currentPlayer === RED) {
            statusEl.textContent = '🎉 Rot gewinnt! (Schwarz kann nicht ziehen)';
        } else {
            statusEl.textContent = '🎉 Schwarz gewinnt! (Rot kann nicht ziehen)';
        }
        isGameOver = true;
        return true;
    }

    return false;
}

// ===== SCHRITT 19: Neues Spiel =====

function startGame() {
    createBoard();
    currentPlayer = RED;
    selectedPiece = null;
    validMoves = null;
    multiJumpPiece = null;
    isGameOver = false;
    statusEl.textContent = '🔴 Rot ist dran';
    updateScores();
    renderBoard();
}

newGameBtn.addEventListener('click', startGame);

// Spiel starten!
startGame();
