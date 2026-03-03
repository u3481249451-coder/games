/*
  Schach — Spiellogik

  ÜBERSICHT:
  ==========
  Schach ist das komplexeste Spiel in unserer Sammlung.
  Der Code ist in logische Blöcke aufgeteilt:

  1. Daten:      Wie speichern wir das Brett? (2D-Array mit Buchstaben)
  2. Züge:       Welche Züge kann jede Figur machen? (6 verschiedene Regel-Sets)
  3. Schach:     Steht ein König unter Angriff?
  4. Legalität:  Ist ein Zug erlaubt? (Darf den eigenen König nicht im Schach lassen)
  5. Sonderzüge: Rochade, En Passant, Bauernumwandlung
  6. Spielende:  Schachmatt oder Patt?

  FIGURENDARSTELLUNG:
  ===================
  Jede Figur wird als 2 Zeichen gespeichert:
  - 1. Zeichen: Farbe ('w' = weiß, 'b' = schwarz)
  - 2. Zeichen: Typ ('K'=König, 'Q'=Dame, 'R'=Turm, 'B'=Läufer, 'N'=Springer, 'P'=Bauer)

  Beispiele: 'wK' = weißer König, 'bQ' = schwarze Dame, '' = leeres Feld
*/

(function () {
    // ===== SCHRITT 1: Konstanten =====

    // Unicode-Symbole für die Figuren
    var SYMBOLS = {
        wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
        bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
    };

    // ===== SCHRITT 2: HTML-Elemente =====

    var boardEl = document.getElementById('board');
    var statusEl = document.getElementById('status');
    var capturedWhiteEl = document.getElementById('capturedWhite');
    var capturedBlackEl = document.getElementById('capturedBlack');
    var promotionEl = document.getElementById('promotion');
    var promoChoicesEl = document.getElementById('promoChoices');
    var newGameBtn = document.getElementById('newGameBtn');

    // ===== SCHRITT 3: Spielvariablen =====

    var board;              // 8×8 Array
    var currentPlayer;      // 'w' oder 'b'
    var selectedCell;       // {row, col} der ausgewählten Figur
    var validMoves;         // Array von gültigen Zielfeldern
    var lastMove;           // Letzter Zug (für En Passant und Hervorhebung)
    var capturedWhite;      // Geschlagene weiße Figuren
    var capturedBlack;      // Geschlagene schwarze Figuren
    var isGameOver;

    // Für Sonderzüge: Hat sich König/Turm schon bewegt?
    var hasMoved;
    // hasMoved = { wK: false, wR0: false, wR7: false, bK: false, bR0: false, bR7: false }

    // Für Bauernumwandlung
    var pendingPromotion;   // {row, col} des umzuwandelnden Bauern

    // ===== SCHRITT 4: Startaufstellung =====

    function createStartBoard() {
        /*
          Das Schachbrett von oben gesehen:
          Zeile 0 = Schwarz (oben im Bild)
          Zeile 7 = Weiß (unten im Bild)

          Aufstellung:
          Zeile 0: Turm Springer Läufer Dame König Läufer Springer Turm
          Zeile 1: 8 Bauern (schwarz)
          Zeile 2-5: leer
          Zeile 6: 8 Bauern (weiß)
          Zeile 7: Turm Springer Läufer Dame König Läufer Springer Turm
        */
        return [
            ['bR','bN','bB','bQ','bK','bB','bN','bR'],
            ['bP','bP','bP','bP','bP','bP','bP','bP'],
            ['',  '',  '',  '',  '',  '',  '',  '' ],
            ['',  '',  '',  '',  '',  '',  '',  '' ],
            ['',  '',  '',  '',  '',  '',  '',  '' ],
            ['',  '',  '',  '',  '',  '',  '',  '' ],
            ['wP','wP','wP','wP','wP','wP','wP','wP'],
            ['wR','wN','wB','wQ','wK','wB','wN','wR']
        ];
    }

    // ===== SCHRITT 5: Spiel starten =====

    function startGame() {
        board = createStartBoard();
        currentPlayer = 'w';
        selectedCell = null;
        validMoves = [];
        lastMove = null;
        capturedWhite = [];
        capturedBlack = [];
        isGameOver = false;
        pendingPromotion = null;

        hasMoved = {
            wK: false, wR0: false, wR7: false,
            bK: false, bR0: false, bR7: false
        };

        capturedWhiteEl.textContent = '';
        capturedBlackEl.textContent = '';
        statusEl.textContent = '♙ Weiß ist am Zug';
        promotionEl.classList.add('hidden');

        renderBoard();
    }

    // ===== SCHRITT 6: Brett anzeigen =====

    function renderBoard() {
        boardEl.innerHTML = '';

        // König-Position finden (für Schach-Markierung)
        var kingPos = findKing(currentPlayer);
        var inCheck = isInCheck(currentPlayer);

        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Helle/dunkle Felder
                cell.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');

                // Ausgewähltes Feld
                if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
                    cell.classList.add('selected');
                }

                // Letzter Zug hervorheben
                if (lastMove) {
                    if ((lastMove.fromRow === r && lastMove.fromCol === c) ||
                        (lastMove.toRow === r && lastMove.toCol === c)) {
                        cell.classList.add('last-move');
                    }
                }

                // König im Schach markieren
                if (inCheck && kingPos && kingPos.row === r && kingPos.col === c) {
                    cell.classList.add('in-check');
                }

                // Gültige Züge markieren
                if (isValidMoveTarget(r, c)) {
                    if (board[r][c] !== '') {
                        cell.classList.add('valid-capture');
                    } else {
                        cell.classList.add('valid-move');
                    }
                }

                // Figur auf dem Feld
                var piece = board[r][c];
                if (piece) {
                    var pieceEl = document.createElement('span');
                    pieceEl.className = 'piece';
                    pieceEl.textContent = SYMBOLS[piece];
                    cell.appendChild(pieceEl);
                }

                cell.addEventListener('click', onCellClick);
                boardEl.appendChild(cell);
            }
        }
    }

    // ===== SCHRITT 7: Klick-Handling =====

    function onCellClick(e) {
        if (isGameOver || pendingPromotion) return;

        var cell = e.target.closest('.cell');
        /*
          closest('.cell') sucht vom geklickten Element aufwärts im DOM-Baum
          nach dem nächsten Element mit der Klasse 'cell'.
          Nützlich weil wir auf die Figur (span) ODER die Zelle (div) klicken könnten.
        */
        var row = parseInt(cell.dataset.row);
        var col = parseInt(cell.dataset.col);
        var piece = board[row][col];

        // Ist das Zielfeld ein gültiger Zug?
        if (selectedCell && isValidMoveTarget(row, col)) {
            executeMove(selectedCell.row, selectedCell.col, row, col);
            return;
        }

        // Eigene Figur angeklickt → auswählen
        if (piece && piece[0] === currentPlayer) {
            selectedCell = { row: row, col: col };
            validMoves = getLegalMoves(row, col);
            renderBoard();
        } else {
            // Leeres Feld oder gegnerische Figur → Auswahl aufheben
            selectedCell = null;
            validMoves = [];
            renderBoard();
        }
    }

    function isValidMoveTarget(row, col) {
        for (var i = 0; i < validMoves.length; i++) {
            if (validMoves[i].row === row && validMoves[i].col === col) return true;
        }
        return false;
    }

    // ===== SCHRITT 8: ZUGREGELN (Herzstück!) =====

    function getRawMoves(row, col) {
        /*
          Berechnet alle MÖGLICHEN Züge einer Figur,
          OHNE zu prüfen ob der eigene König danach im Schach steht.
          (Das prüfen wir später in getLegalMoves)
        */
        var piece = board[row][col];
        if (!piece) return [];

        var color = piece[0];  // 'w' oder 'b'
        var type = piece[1];   // 'K', 'Q', 'R', 'B', 'N', 'P'
        var moves = [];

        switch (type) {
            case 'P': moves = getPawnMoves(row, col, color); break;
            case 'R': moves = getSlidingMoves(row, col, color, [[0,1],[0,-1],[1,0],[-1,0]]); break;
            case 'B': moves = getSlidingMoves(row, col, color, [[1,1],[1,-1],[-1,1],[-1,-1]]); break;
            case 'Q': moves = getSlidingMoves(row, col, color, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]); break;
            case 'N': moves = getKnightMoves(row, col, color); break;
            case 'K': moves = getKingMoves(row, col, color); break;
        }

        return moves;
    }

    // --- BAUER ---
    function getPawnMoves(row, col, color) {
        /*
          Bauern sind die komplizierteste Figur:
          - Ziehen vorwärts (1 Feld), können aber NICHT schlagen vorwärts
          - Schlagen diagonal (1 Feld)
          - Vom Startfeld 2 Felder vorwärts möglich
          - En Passant (schlagen im Vorbeigehen)
          - Umwandlung auf der letzten Reihe
        */
        var moves = [];
        var dir = color === 'w' ? -1 : 1;
        // Weiß geht nach oben (-1), Schwarz nach unten (+1)
        var startRow = color === 'w' ? 6 : 1;

        // 1 Feld vorwärts (nur wenn leer!)
        if (inBounds(row + dir, col) && board[row + dir][col] === '') {
            moves.push({ row: row + dir, col: col });

            // 2 Felder vorwärts vom Startfeld (nur wenn BEIDE leer!)
            if (row === startRow && board[row + dir * 2][col] === '') {
                moves.push({ row: row + dir * 2, col: col });
            }
        }

        // Diagonal schlagen (nur wenn Gegner dort steht!)
        for (var dc = -1; dc <= 1; dc += 2) {
            // dc = -1 (links) und +1 (rechts)
            var nr = row + dir;
            var nc = col + dc;
            if (!inBounds(nr, nc)) continue;

            // Normales Schlagen
            if (board[nr][nc] !== '' && board[nr][nc][0] !== color) {
                moves.push({ row: nr, col: nc });
            }

            // En Passant
            if (lastMove && lastMove.type === 'P' &&
                Math.abs(lastMove.fromRow - lastMove.toRow) === 2 &&
                lastMove.toRow === row && lastMove.toCol === nc) {
                /*
                  En Passant ist möglich wenn:
                  1. Der letzte Zug war ein Bauer
                  2. Der Bauer ist 2 Felder vorgerückt
                  3. Unser Bauer steht NEBEN dem gegnerischen Bauern
                  4. Wir schlagen diagonal HINTER den gegnerischen Bauern
                */
                moves.push({ row: nr, col: nc, enPassant: true });
            }
        }

        return moves;
    }

    // --- GLEITENDE FIGUREN (Turm, Läufer, Dame) ---
    function getSlidingMoves(row, col, color, directions) {
        /*
          Turm, Läufer und Dame "gleiten" in eine Richtung,
          bis sie auf ein Hindernis treffen.

          Turm: 4 Richtungen (horizontal + vertikal)
          Läufer: 4 Richtungen (diagonal)
          Dame: 8 Richtungen (alle)

          Wir nutzen die GLEICHE Funktion für alle 3!
          Der einzige Unterschied sind die Richtungen.
        */
        var moves = [];

        for (var d = 0; d < directions.length; d++) {
            var dr = directions[d][0];
            var dc = directions[d][1];
            var r = row + dr;
            var c = col + dc;

            while (inBounds(r, c)) {
                if (board[r][c] === '') {
                    // Leeres Feld → weiter gleiten
                    moves.push({ row: r, col: c });
                } else if (board[r][c][0] !== color) {
                    // Gegnerische Figur → schlagen, aber danach stoppen
                    moves.push({ row: r, col: c });
                    break;
                } else {
                    // Eigene Figur → blockiert, stoppen
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    // --- SPRINGER ---
    function getKnightMoves(row, col, color) {
        /*
          Der Springer bewegt sich in einem "L":
          2 Felder in eine Richtung, 1 Feld quer dazu.
          Er SPRINGT über andere Figuren (einzige Figur die das kann!).

          Alle 8 möglichen Springer-Züge:
        */
        var offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        var moves = [];

        for (var i = 0; i < offsets.length; i++) {
            var r = row + offsets[i][0];
            var c = col + offsets[i][1];
            if (inBounds(r, c) && (board[r][c] === '' || board[r][c][0] !== color)) {
                moves.push({ row: r, col: c });
            }
        }

        return moves;
    }

    // --- KÖNIG ---
    function getKingMoves(row, col, color) {
        /*
          Der König kann 1 Feld in jede Richtung ziehen.
          Plus: Rochade (Sonderzug mit dem Turm).
        */
        var offsets = [
            [-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]
        ];
        var moves = [];

        for (var i = 0; i < offsets.length; i++) {
            var r = row + offsets[i][0];
            var c = col + offsets[i][1];
            if (inBounds(r, c) && (board[r][c] === '' || board[r][c][0] !== color)) {
                moves.push({ row: r, col: c });
            }
        }

        // ROCHADE
        addCastlingMoves(row, col, color, moves);

        return moves;
    }

    // ===== SCHRITT 9: ROCHADE =====

    function addCastlingMoves(row, col, color, moves) {
        /*
          Rochade = König und Turm tauschen gleichzeitig.
          Bedingungen:
          1. König hat sich noch nicht bewegt
          2. Turm hat sich noch nicht bewegt
          3. Keine Figuren zwischen König und Turm
          4. König steht NICHT im Schach
          5. König zieht NICHT DURCH ein Schach
          6. König landet NICHT im Schach
        */
        var kingKey = color + 'K';
        if (hasMoved[kingKey]) return;
        if (isInCheck(color)) return;

        // Kurze Rochade (Königsseite, rechts)
        var rookKeyShort = color + 'R7';
        if (!hasMoved[rookKeyShort] && board[row][7] === color + 'R') {
            if (board[row][5] === '' && board[row][6] === '') {
                // Prüfen ob König durch Schach zieht
                if (!isSquareAttacked(row, 5, color) && !isSquareAttacked(row, 6, color)) {
                    moves.push({ row: row, col: 6, castling: 'short' });
                }
            }
        }

        // Lange Rochade (Damenseite, links)
        var rookKeyLong = color + 'R0';
        if (!hasMoved[rookKeyLong] && board[row][0] === color + 'R') {
            if (board[row][1] === '' && board[row][2] === '' && board[row][3] === '') {
                if (!isSquareAttacked(row, 2, color) && !isSquareAttacked(row, 3, color)) {
                    moves.push({ row: row, col: 2, castling: 'long' });
                }
            }
        }
    }

    // ===== SCHRITT 10: SCHACH-ERKENNUNG =====

    function findKing(color) {
        // Sucht die Position des Königs einer Farbe
        var king = color + 'K';
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                if (board[r][c] === king) return { row: r, col: c };
            }
        }
        return null;
    }

    function isInCheck(color) {
        // Steht der König der angegebenen Farbe im Schach?
        var kingPos = findKing(color);
        if (!kingPos) return false;
        return isSquareAttacked(kingPos.row, kingPos.col, color);
    }

    function isSquareAttacked(row, col, byDefendingColor) {
        /*
          Wird dieses Feld von einer gegnerischen Figur angegriffen?

          Trick: Statt von JEDER gegnerischen Figur alle Züge zu berechnen,
          schauen wir "rückwärts" von diesem Feld aus:
          - Gibt es einen gegnerischen Turm/Dame in gerader Linie?
          - Gibt es einen gegnerischen Läufer/Dame diagonal?
          - Gibt es einen gegnerischen Springer im L-Abstand?
          - Gibt es einen gegnerischen Bauern diagonal davor?
        */
        var enemy = byDefendingColor === 'w' ? 'b' : 'w';

        // Springer-Angriffe prüfen
        var knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (var i = 0; i < knightOffsets.length; i++) {
            var r = row + knightOffsets[i][0];
            var c = col + knightOffsets[i][1];
            if (inBounds(r, c) && board[r][c] === enemy + 'N') return true;
        }

        // Bauern-Angriffe prüfen
        var pawnDir = byDefendingColor === 'w' ? -1 : 1;
        // Gegnerischer Bauer steht diagonal VOR uns
        if (inBounds(row + pawnDir, col - 1) && board[row + pawnDir][col - 1] === enemy + 'P') return true;
        if (inBounds(row + pawnDir, col + 1) && board[row + pawnDir][col + 1] === enemy + 'P') return true;

        // König-Angriffe prüfen (König darf nicht neben König stehen)
        var kingOffsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (var i = 0; i < kingOffsets.length; i++) {
            var r = row + kingOffsets[i][0];
            var c = col + kingOffsets[i][1];
            if (inBounds(r, c) && board[r][c] === enemy + 'K') return true;
        }

        // Gleitende Angriffe (Turm, Läufer, Dame)
        // Gerade Linien → Turm oder Dame
        var straightDirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (var d = 0; d < straightDirs.length; d++) {
            var target = firstPieceInDirection(row, col, straightDirs[d][0], straightDirs[d][1]);
            if (target && target[0] === enemy && (target[1] === 'R' || target[1] === 'Q')) return true;
        }

        // Diagonale → Läufer oder Dame
        var diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
        for (var d = 0; d < diagDirs.length; d++) {
            var target = firstPieceInDirection(row, col, diagDirs[d][0], diagDirs[d][1]);
            if (target && target[0] === enemy && (target[1] === 'B' || target[1] === 'Q')) return true;
        }

        return false;
    }

    function firstPieceInDirection(row, col, dr, dc) {
        // Findet die erste Figur in einer Richtung
        var r = row + dr;
        var c = col + dc;
        while (inBounds(r, c)) {
            if (board[r][c] !== '') return board[r][c];
            r += dr;
            c += dc;
        }
        return null;
    }

    // ===== SCHRITT 11: LEGALE ZÜGE =====

    function getLegalMoves(row, col) {
        /*
          Ein Zug ist nur LEGAL, wenn der eigene König danach
          NICHT im Schach steht.

          Methode: Jeden möglichen Zug simulieren, prüfen ob
          der König dann im Schach steht, und rückgängig machen.
        */
        var rawMoves = getRawMoves(row, col);
        var color = board[row][col][0];
        var legal = [];

        for (var i = 0; i < rawMoves.length; i++) {
            var move = rawMoves[i];

            // Zug simulieren
            var captured = board[move.row][move.col];
            var original = board[row][col];

            board[move.row][move.col] = original;
            board[row][col] = '';

            // En Passant: auch den geschlagenen Bauern entfernen
            var epCaptured = '';
            if (move.enPassant) {
                epCaptured = board[row][move.col];
                board[row][move.col] = '';
            }

            // Ist der König nach diesem Zug im Schach?
            if (!isInCheck(color)) {
                legal.push(move);
            }

            // Zug rückgängig machen
            board[row][col] = original;
            board[move.row][move.col] = captured;
            if (move.enPassant) {
                board[row][move.col] = epCaptured;
            }
        }

        return legal;
    }

    // ===== SCHRITT 12: ZUG AUSFÜHREN =====

    function executeMove(fromRow, fromCol, toRow, toCol) {
        var piece = board[fromRow][fromCol];
        var color = piece[0];
        var type = piece[1];
        var captured = board[toRow][toCol];

        // Den passenden Zug finden (für Sonderzug-Infos)
        var moveInfo = null;
        for (var i = 0; i < validMoves.length; i++) {
            if (validMoves[i].row === toRow && validMoves[i].col === toCol) {
                moveInfo = validMoves[i];
                break;
            }
        }

        // Geschlagene Figur merken
        if (captured) {
            if (captured[0] === 'w') {
                capturedWhite.push(SYMBOLS[captured]);
            } else {
                capturedBlack.push(SYMBOLS[captured]);
            }
        }

        // En Passant: gegnerischen Bauern entfernen
        if (moveInfo && moveInfo.enPassant) {
            var epPiece = board[fromRow][toCol];
            if (epPiece[0] === 'w') {
                capturedWhite.push(SYMBOLS[epPiece]);
            } else {
                capturedBlack.push(SYMBOLS[epPiece]);
            }
            board[fromRow][toCol] = '';
        }

        // Figur bewegen
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = '';

        // Rochade: Turm auch bewegen
        if (moveInfo && moveInfo.castling === 'short') {
            board[fromRow][5] = board[fromRow][7];
            board[fromRow][7] = '';
        }
        if (moveInfo && moveInfo.castling === 'long') {
            board[fromRow][3] = board[fromRow][0];
            board[fromRow][0] = '';
        }

        // "Hat sich bewegt" merken (für Rochade)
        if (type === 'K') hasMoved[color + 'K'] = true;
        if (type === 'R' && fromCol === 0) hasMoved[color + 'R0'] = true;
        if (type === 'R' && fromCol === 7) hasMoved[color + 'R7'] = true;

        // Letzten Zug speichern
        lastMove = {
            fromRow: fromRow, fromCol: fromCol,
            toRow: toRow, toCol: toCol,
            type: type
        };

        // Bauernumwandlung prüfen
        var promoRow = color === 'w' ? 0 : 7;
        if (type === 'P' && toRow === promoRow) {
            pendingPromotion = { row: toRow, col: toCol, color: color };
            selectedCell = null;
            validMoves = [];
            renderBoard();
            showPromotionDialog(color);
            return;
        }

        // Zug abschließen
        finishTurn();
    }

    // ===== SCHRITT 13: BAUERNUMWANDLUNG =====

    function showPromotionDialog(color) {
        /*
          Wenn ein Bauer die letzte Reihe erreicht,
          muss er in eine andere Figur umgewandelt werden.
          Der Spieler wählt: Dame, Turm, Läufer oder Springer.
        */
        promoChoicesEl.innerHTML = '';
        var options = ['Q', 'R', 'B', 'N'];

        for (var i = 0; i < options.length; i++) {
            var btn = document.createElement('button');
            btn.className = 'promo-btn';
            btn.textContent = SYMBOLS[color + options[i]];
            btn.dataset.type = options[i];

            btn.addEventListener('click', function () {
                var newType = this.dataset.type;
                board[pendingPromotion.row][pendingPromotion.col] = pendingPromotion.color + newType;
                pendingPromotion = null;
                promotionEl.classList.add('hidden');
                finishTurn();
            });

            promoChoicesEl.appendChild(btn);
        }

        promotionEl.classList.remove('hidden');
    }

    // ===== SCHRITT 14: ZUG ABSCHLIESSEN =====

    function finishTurn() {
        selectedCell = null;
        validMoves = [];

        // Geschlagene Figuren aktualisieren
        capturedWhiteEl.textContent = capturedWhite.join('');
        capturedBlackEl.textContent = capturedBlack.join('');
        // .join('') = Array-Elemente zu einem String zusammenfügen
        // ['♙','♗'] → '♙♗'

        // Spieler wechseln
        currentPlayer = currentPlayer === 'w' ? 'b' : 'w';

        // Spielende prüfen
        var inCheck = isInCheck(currentPlayer);
        var hasLegal = hasAnyLegalMoves(currentPlayer);

        if (!hasLegal) {
            isGameOver = true;
            if (inCheck) {
                // Schachmatt!
                var winner = currentPlayer === 'w' ? 'Schwarz' : 'Weiß';
                statusEl.textContent = '♚ Schachmatt! ' + winner + ' gewinnt!';
            } else {
                // Patt (keine Züge, aber nicht im Schach)
                statusEl.textContent = '🤝 Patt! Unentschieden.';
            }
        } else if (inCheck) {
            statusEl.textContent = (currentPlayer === 'w' ? '♙' : '♟') +
                ' Schach! ' + (currentPlayer === 'w' ? 'Weiß' : 'Schwarz') + ' ist am Zug';
        } else {
            statusEl.textContent = (currentPlayer === 'w' ? '♙ Weiß' : '♟ Schwarz') + ' ist am Zug';
        }

        renderBoard();
    }

    // ===== SCHRITT 15: HAT LEGALE ZÜGE? =====

    function hasAnyLegalMoves(color) {
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                if (board[r][c] && board[r][c][0] === color) {
                    if (getLegalMoves(r, c).length > 0) return true;
                }
            }
        }
        return false;
    }

    // ===== SCHRITT 16: HILFSFUNKTIONEN =====

    function inBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // ===== SCHRITT 17: NEUES SPIEL =====

    newGameBtn.addEventListener('click', startGame);
    startGame();
})();
