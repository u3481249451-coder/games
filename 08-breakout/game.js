/*
  Breakout / Arkanoid

  Neue Konzepte:

  - OBJEKTE IN ARRAYS:
    ==========================================
    Jeder Stein ist ein Objekt mit Eigenschaften:
    { x: 100, y: 50, width: 70, height: 20, color: '#ff0000', alive: true }

    Alle Steine sind in einem Array gespeichert.
    Wir gehen jeden Frame durch ALLE Steine und prüfen Kollisionen.

  - POWERUPS:
    ==========================================
    Wenn ein Stein zerstört wird, fällt manchmal ein Powerup herunter.
    Powerups sind auch Objekte in einem Array:
    { x, y, type, width, height }

    Typen:
    - 'wide'   → Schläger wird breiter
    - 'life'   → Extra-Leben
    - 'speed'  → Ball wird langsamer
    - 'multi'  → Ball wird zu 3 Bällen (Bonus-Feature!)

  - LEVEL-SYSTEM:
    ==========================================
    Wenn alle Steine zerstört sind → neues Level.
    Jedes Level hat mehr Reihen und der Ball wird schneller.
*/

(function () {
    // ===== SCHRITT 1: Setup =====

    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var statusEl = document.getElementById('status');
    var scoreEl = document.getElementById('score');
    var levelEl = document.getElementById('level');
    var livesEl = document.getElementById('lives');

    var W = canvas.width;   // 600
    var H = canvas.height;  // 500

    // ===== SCHRITT 2: Konstanten =====

    var PADDLE_W = 90;
    var PADDLE_H = 14;
    var BALL_R = 6;          // Ball-Radius
    var BALL_SPEED = 4;
    var BRICK_ROWS = 5;      // Start-Anzahl Reihen
    var BRICK_COLS = 10;
    var BRICK_H = 18;
    var BRICK_PAD = 4;       // Abstand zwischen Steinen (Padding)
    var BRICK_TOP = 50;      // Abstand vom oberen Rand
    var POWERUP_CHANCE = 0.15;  // 15% Chance auf Powerup
    var POWERUP_SIZE = 16;
    var POWERUP_SPEED = 2;

    // Farben für die Stein-Reihen (von oben nach unten)
    var ROW_COLORS = [
        '#ff1744', '#ff9100', '#ffea00', '#76ff03',
        '#00e5ff', '#2979ff', '#d500f9', '#ff6d00',
        '#00e676', '#40c4ff'
    ];

    // Powerup-Typen mit Farben und Symbolen
    var POWERUP_TYPES = [
        { type: 'wide',  color: '#76ff03', symbol: '⟷' },
        { type: 'life',  color: '#ff5252', symbol: '♥' },
        { type: 'slow',  color: '#40c4ff', symbol: '▼' }
    ];

    // ===== SCHRITT 3: Spielvariablen =====

    var paddle;
    var balls;        // Array von Bällen (für Multi-Ball Powerup)
    var bricks;       // Array von Steinen
    var powerups;     // Array von fallenden Powerups
    var score;
    var level;
    var lives;
    var running;
    var gameOver;

    // Maus/Touch-Position für Schläger-Steuerung
    var mouseX = W / 2;

    // ===== SCHRITT 4: Eingabe =====

    // Maus steuert den Schläger
    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = W / rect.width;
        mouseX = (e.clientX - rect.left) * scaleX;
    });

    // Touch steuert den Schläger
    canvas.addEventListener('touchmove', function (e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var scaleX = W / rect.width;
        mouseX = (e.touches[0].clientX - rect.left) * scaleX;
    }, { passive: false });

    // Leertaste / Klick / Touch startet das Spiel
    document.addEventListener('keydown', function (e) {
        if (e.key === ' ') {
            e.preventDefault();
            startOrResume();
        }
    });

    canvas.addEventListener('click', startOrResume);
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        startOrResume();
    });

    function startOrResume() {
        if (gameOver) {
            initGame();
            return;
        }
        if (!running) {
            running = true;
            launchBall();
            gameLoop();
        }
    }

    // ===== SCHRITT 5: Spiel initialisieren =====

    function initGame() {
        score = 0;
        level = 1;
        lives = 3;
        gameOver = false;
        running = false;

        scoreEl.textContent = '0';
        levelEl.textContent = '1';
        updateLivesDisplay();

        initLevel();
        draw();
        statusEl.textContent = 'Leertaste oder Tippen zum Starten';
    }

    function initLevel() {
        paddle = {
            x: W / 2 - PADDLE_W / 2,
            y: H - 30,
            w: PADDLE_W
        };

        balls = [];
        powerups = [];
        running = false;

        createBricks();
        resetBall();
        draw();
        statusEl.textContent = 'Level ' + level + ' — Leertaste zum Starten';
    }

    // ===== SCHRITT 6: Steine erzeugen =====

    function createBricks() {
        /*
          Wir berechnen die Breite jedes Steins dynamisch:
          Gesamtbreite = Canvas-Breite - Rand links - Rand rechts
          Steinbreite = (Gesamtbreite - Abstände) / Anzahl Spalten
        */
        bricks = [];

        var rows = Math.min(BRICK_ROWS + level - 1, 10);
        // Mehr Reihen pro Level, maximal 10

        var sideMargin = 20;
        var totalWidth = W - sideMargin * 2;
        var brickW = (totalWidth - BRICK_PAD * (BRICK_COLS - 1)) / BRICK_COLS;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < BRICK_COLS; c++) {
                bricks.push({
                    x: sideMargin + c * (brickW + BRICK_PAD),
                    y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
                    w: brickW,
                    h: BRICK_H,
                    color: ROW_COLORS[r % ROW_COLORS.length],
                    // % ROW_COLORS.length = Farben wiederholen wenn mehr Reihen als Farben
                    alive: true,
                    points: (rows - r) * 10
                    // Obere Reihen geben mehr Punkte (schwerer zu treffen)
                });
            }
        }
    }

    // ===== SCHRITT 7: Ball erzeugen =====

    function resetBall() {
        balls = [{
            x: W / 2,
            y: paddle.y - BALL_R - 2,
            vx: 0,
            vy: 0,
            speed: BALL_SPEED + (level - 1) * 0.5
            // Ball wird pro Level schneller
        }];
    }

    function launchBall() {
        if (balls.length === 0) resetBall();

        var ball = balls[0];
        if (ball.vx === 0 && ball.vy === 0) {
            // Zufällige Startrichtung (leicht nach links oder rechts)
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
            // -PI/2 = nach oben, ±0.4 = leichte Abweichung
            ball.vx = Math.cos(angle) * ball.speed;
            ball.vy = Math.sin(angle) * ball.speed;
        }
    }

    // ===== SCHRITT 8: Game Loop =====

    function gameLoop() {
        if (!running) return;

        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // ===== SCHRITT 9: Update =====

    function update() {
        // --- Schläger zur Maus bewegen ---
        paddle.x = mouseX - paddle.w / 2;
        // Schläger im Spielfeld halten
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.w > W) paddle.x = W - paddle.w;

        // --- Jeden Ball bewegen ---
        // Wir gehen RÜCKWÄRTS durch das Array, weil wir Bälle entfernen könnten
        for (var b = balls.length - 1; b >= 0; b--) {
            var ball = balls[b];
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wand-Kollision links/rechts
            if (ball.x - BALL_R < 0) {
                ball.x = BALL_R;
                ball.vx = Math.abs(ball.vx);
                // Math.abs() = Absolutwert → macht die Zahl positiv → Ball fliegt nach rechts
            }
            if (ball.x + BALL_R > W) {
                ball.x = W - BALL_R;
                ball.vx = -Math.abs(ball.vx);
                // -Math.abs() → macht die Zahl negativ → Ball fliegt nach links
            }

            // Wand-Kollision oben
            if (ball.y - BALL_R < 0) {
                ball.y = BALL_R;
                ball.vy = Math.abs(ball.vy);
            }

            // Ball fällt unten raus
            if (ball.y > H + BALL_R) {
                balls.splice(b, 1);
                /*
                  splice(index, anzahl) entfernt Elemente aus einem Array.
                  splice(b, 1) = "Entferne 1 Element an Position b"

                  Warum rückwärts durch das Array?
                  Wenn wir Element 3 entfernen, rutschen 4, 5, 6... nach.
                  Vorwärts würden wir dann ein Element überspringen.
                  Rückwärts ist das kein Problem!
                */
                continue;
            }

            // Schläger-Kollision
            if (ball.vy > 0 && ballHitsRect(ball, paddle.x, paddle.y, paddle.w, PADDLE_H)) {
                ball.y = paddle.y - BALL_R;

                // Abprallwinkel basierend auf Treffpunkt
                var hitPoint = (ball.x - paddle.x) / paddle.w;
                // 0 = ganz links, 0.5 = Mitte, 1 = ganz rechts
                var angle = (hitPoint - 0.5) * Math.PI * 0.7;
                // Winkel zwischen ca. -63° und +63°

                ball.vx = Math.sin(angle) * ball.speed;
                ball.vy = -Math.cos(angle) * ball.speed;
                // Minus weil der Ball nach OBEN fliegen soll
            }

            // Stein-Kollisionen
            checkBrickCollisions(ball);
        }

        // Alle Bälle verloren?
        if (balls.length === 0) {
            loseLife();
        }

        // --- Powerups bewegen ---
        for (var p = powerups.length - 1; p >= 0; p--) {
            var pu = powerups[p];
            pu.y += POWERUP_SPEED;  // Fällt nach unten

            // Powerup vom Schläger aufgefangen?
            if (pu.y + POWERUP_SIZE > paddle.y &&
                pu.y < paddle.y + PADDLE_H &&
                pu.x + POWERUP_SIZE > paddle.x &&
                pu.x < paddle.x + paddle.w) {

                applyPowerup(pu);
                powerups.splice(p, 1);
                continue;
            }

            // Powerup fällt unten raus
            if (pu.y > H) {
                powerups.splice(p, 1);
            }
        }

        // Alle Steine zerstört? → Nächstes Level!
        var aliveCount = 0;
        for (var i = 0; i < bricks.length; i++) {
            if (bricks[i].alive) aliveCount++;
        }

        if (aliveCount === 0) {
            nextLevel();
        }
    }

    // ===== SCHRITT 10: Ball-Rechteck-Kollision =====

    function ballHitsRect(ball, rx, ry, rw, rh) {
        /*
          Prüft ob ein Kreis (Ball) ein Rechteck berührt.

          Wir finden den nächsten Punkt auf dem Rechteck zum Ball-Mittelpunkt.
          Wenn der Abstand zum Ball-Mittelpunkt kleiner als der Radius ist → Kollision!
        */
        var closestX = clamp(ball.x, rx, rx + rw);
        var closestY = clamp(ball.y, ry, ry + rh);

        var dx = ball.x - closestX;
        var dy = ball.y - closestY;

        return (dx * dx + dy * dy) < (BALL_R * BALL_R);
        /*
          dx * dx + dy * dy = Quadrat des Abstands (Pythagoras!)
          Wir vergleichen mit BALL_R * BALL_R statt Math.sqrt() zu nutzen
          → gleiche Logik, aber schneller (Wurzel ist langsam)
        */
    }

    // ===== SCHRITT 11: Stein-Kollisionen =====

    function checkBrickCollisions(ball) {
        for (var i = 0; i < bricks.length; i++) {
            var brick = bricks[i];
            if (!brick.alive) continue;

            if (ballHitsRect(ball, brick.x, brick.y, brick.w, brick.h)) {
                brick.alive = false;
                score += brick.points;
                scoreEl.textContent = score;

                // Ball-Richtung ändern (von welcher Seite kam er?)
                /*
                  Wir prüfen ob der Ball eher von oben/unten oder
                  von links/rechts kam, und kehren die passende Achse um.

                  overlapX = wie tief steckt der Ball horizontal im Stein?
                  overlapY = wie tief steckt der Ball vertikal im Stein?

                  Kleinerer Overlap = von dieser Seite kam der Ball
                */
                var overlapLeft = ball.x + BALL_R - brick.x;
                var overlapRight = brick.x + brick.w - (ball.x - BALL_R);
                var overlapTop = ball.y + BALL_R - brick.y;
                var overlapBottom = brick.y + brick.h - (ball.y - BALL_R);

                var minOverlapX = Math.min(overlapLeft, overlapRight);
                var minOverlapY = Math.min(overlapTop, overlapBottom);

                if (minOverlapX < minOverlapY) {
                    ball.vx = -ball.vx;  // Von der Seite getroffen
                } else {
                    ball.vy = -ball.vy;  // Von oben/unten getroffen
                }

                // Powerup spawnen?
                maybeSpawnPowerup(brick);

                break;
                // Nur eine Kollision pro Frame (sonst doppeltes Abprallen)
            }
        }
    }

    // ===== SCHRITT 12: Powerups =====

    function maybeSpawnPowerup(brick) {
        if (Math.random() > POWERUP_CHANCE) return;
        // 85% der Zeit passiert nichts (return = Funktion beenden)

        // Zufälligen Powerup-Typ wählen
        var type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];

        powerups.push({
            x: brick.x + brick.w / 2 - POWERUP_SIZE / 2,
            y: brick.y,
            type: type.type,
            color: type.color,
            symbol: type.symbol,
            w: POWERUP_SIZE,
            h: POWERUP_SIZE
        });
    }

    function applyPowerup(pu) {
        /*
          switch = wie if/else, aber übersichtlicher bei vielen Fällen.

          switch(wert) {
              case 'a': ... break;
              case 'b': ... break;
          }

          Ohne break würde es zum nächsten case "durchfallen"!
        */
        switch (pu.type) {
            case 'wide':
                // Schläger wird breiter (max 180px)
                paddle.w = Math.min(paddle.w + 30, 180);
                break;

            case 'life':
                // Extra-Leben (max 5)
                lives = Math.min(lives + 1, 5);
                updateLivesDisplay();
                break;

            case 'slow':
                // Alle Bälle werden langsamer
                for (var i = 0; i < balls.length; i++) {
                    balls[i].speed = Math.max(balls[i].speed - 1, 2);
                    // Math.max() = nicht langsamer als 2

                    // Aktuelle Geschwindigkeit anpassen
                    var currentSpeed = Math.sqrt(balls[i].vx * balls[i].vx + balls[i].vy * balls[i].vy);
                    if (currentSpeed > 0) {
                        var factor = balls[i].speed / currentSpeed;
                        balls[i].vx *= factor;
                        balls[i].vy *= factor;
                        // *= ist kurz für: balls[i].vx = balls[i].vx * factor
                    }
                }
                break;
        }
    }

    // ===== SCHRITT 13: Leben verlieren =====

    function loseLife() {
        lives--;
        updateLivesDisplay();

        if (lives <= 0) {
            running = false;
            gameOver = true;
            statusEl.textContent = 'Game Over! Score: ' + score + ' — Klick zum Neustarten';
        } else {
            running = false;
            paddle.w = PADDLE_W; // Schläger zurücksetzen
            resetBall();
            draw();
            statusEl.textContent = 'Ball verloren! Noch ' + lives + ' Leben. Leertaste zum Weiter.';
        }
    }

    function updateLivesDisplay() {
        var hearts = '';
        for (var i = 0; i < lives; i++) {
            hearts += '♥';
        }
        livesEl.textContent = hearts;
    }

    // ===== SCHRITT 14: Nächstes Level =====

    function nextLevel() {
        level++;
        levelEl.textContent = level;
        paddle.w = PADDLE_W; // Schläger zurücksetzen
        initLevel();
    }

    // ===== SCHRITT 15: Zeichnen =====

    function draw() {
        // Hintergrund
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);

        // --- Steine zeichnen ---
        for (var i = 0; i < bricks.length; i++) {
            var brick = bricks[i];
            if (!brick.alive) continue;

            ctx.fillStyle = brick.color;
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 4;

            // Abgerundetes Rechteck (mit roundRect)
            roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 3);
            ctx.fill();

            // Glanz-Effekt (heller Streifen oben)
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            roundRect(ctx, brick.x, brick.y, brick.w, brick.h / 3, 3);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // --- Schläger zeichnen ---
        ctx.fillStyle = '#ff6f00';
        ctx.shadowColor = 'rgba(255, 111, 0, 0.6)';
        ctx.shadowBlur = 10;
        roundRect(ctx, paddle.x, paddle.y, paddle.w, PADDLE_H, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // --- Bälle zeichnen ---
        for (var b = 0; b < balls.length; b++) {
            var ball = balls[b];
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // --- Powerups zeichnen ---
        for (var p = 0; p < powerups.length; p++) {
            var pu = powerups[p];
            ctx.fillStyle = pu.color;
            ctx.shadowColor = pu.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(
                pu.x + POWERUP_SIZE / 2,
                pu.y + POWERUP_SIZE / 2,
                POWERUP_SIZE / 2, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.shadowBlur = 0;

            // Symbol auf dem Powerup
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(pu.symbol, pu.x + POWERUP_SIZE / 2, pu.y + POWERUP_SIZE / 2 + 4);
        }
    }

    // ===== SCHRITT 16: Hilfsfunktionen =====

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function clamp(value, min, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    // ===== START =====
    initGame();
})();
