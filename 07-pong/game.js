/*
  Pong — Das erste Videospiel der Welt (1972)!

  Neue Konzepte:

  - GAME LOOP mit requestAnimationFrame():
    ==========================================
    Bei Snake haben wir setInterval() benutzt (feste Zeitabstände).
    Für flüssige Spiele gibt es etwas Besseres:

    requestAnimationFrame(funktion)

    Das sagt dem Browser: "Ruf diese Funktion auf, BEVOR du das nächste
    Bild auf den Bildschirm zeichnest." Das passiert ca. 60x pro Sekunde
    (60 FPS = Frames Per Second = Bilder pro Sekunde).

    Vorteil: Der Browser synchronisiert das Zeichnen mit dem Monitor.
    Das Ergebnis ist butterweiche Bewegung ohne Ruckler.

  - PHYSIK (vereinfacht):
    ==========================================
    Der Ball hat eine Geschwindigkeit (velocity) mit X- und Y-Anteil:
    - velocityX = wie schnell nach links/rechts
    - velocityY = wie schnell nach oben/unten

    Jeden Frame addieren wir die Geschwindigkeit zur Position:
    position = position + velocity

    Bei Kollision mit Wand/Schläger wird die Richtung umgekehrt.

  - KOLLISIONSERKENNUNG:
    ==========================================
    "Berührt der Ball den Schläger?"
    Wir prüfen ob sich zwei Rechtecke überlappen (AABB-Kollision):
    - Ball-Kante links < Schläger-Kante rechts?
    - Ball-Kante rechts > Schläger-Kante links?
    - Ball-Kante oben < Schläger-Kante unten?
    - Ball-Kante unten > Schläger-Kante oben?
    Wenn ALLE 4 wahr sind → Kollision!

  - TASTATUR-STATE:
    ==========================================
    Statt bei jedem Tastendruck sofort zu reagieren,
    merken wir uns WELCHE Tasten gerade gedrückt sind.
    So können beide Spieler gleichzeitig ihre Tasten halten.
*/

(function () {
    // ===== SCHRITT 1: Canvas Setup =====

    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    /*
      getContext('2d') gibt uns den "Zeichenstift" für die Leinwand.
      Damit können wir:
      - ctx.fillRect()  → Rechteck zeichnen
      - ctx.beginPath() → Pfad beginnen (für Kreise etc.)
      - ctx.arc()       → Kreis zeichnen
      - ctx.fillText()  → Text schreiben
    */

    var statusEl = document.getElementById('status');
    var modeBtns = document.querySelectorAll('.mode-btn');

    // ===== SCHRITT 2: Spielkonstanten =====

    var W = canvas.width;    // 600 (Breite)
    var H = canvas.height;   // 400 (Höhe)

    var PADDLE_W = 12;       // Schläger-Breite
    var PADDLE_H = 80;       // Schläger-Höhe
    var PADDLE_SPEED = 5;    // Wie schnell sich der Schläger bewegt
    var BALL_SIZE = 8;       // Ball-Radius
    var BALL_SPEED = 4;      // Start-Geschwindigkeit des Balls
    var WIN_SCORE = 7;       // Punkte zum Gewinnen

    // ===== SCHRITT 3: Spielobjekte =====

    /*
      Jedes Objekt im Spiel hat eine Position (x, y).
      Der Ball hat zusätzlich eine Geschwindigkeit (vx, vy).
    */

    var paddle1;  // Linker Schläger (Spieler 1)
    var paddle2;  // Rechter Schläger (Spieler 2 / CPU)
    var ball;     // Der Ball
    var score1;   // Punkte Spieler 1
    var score2;   // Punkte Spieler 2
    var running;
    var gameOver;
    var mode = 'cpu';

    // ===== SCHRITT 4: Tastatur-State =====

    /*
      keys = ein Objekt das speichert, welche Tasten gedrückt sind.
      keys['w'] = true  → W-Taste ist gerade gedrückt
      keys['w'] = false → W-Taste ist nicht gedrückt
    */
    var keys = {};

    document.addEventListener('keydown', function (e) {
        keys[e.key.toLowerCase()] = true;

        // Leertaste startet das Spiel
        if (e.key === ' ') {
            e.preventDefault();
            if (!running) startRound();
        }
    });

    document.addEventListener('keyup', function (e) {
        keys[e.key.toLowerCase()] = false;
    });

    // Touch-Support: Tippen startet das Spiel
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (!running) startRound();
    });

    // Touch: Finger-Position steuert Spieler 1
    canvas.addEventListener('touchmove', function (e) {
        e.preventDefault();
        if (!running) return;

        /*
          getBoundingClientRect() gibt die Position des Canvas auf dem Bildschirm.
          Damit rechnen wir die Finger-Position in Canvas-Koordinaten um.

          scaleY berücksichtigt, dass der Canvas auf dem Handy
          kleiner dargestellt sein könnte als seine echte Größe.
        */
        var rect = canvas.getBoundingClientRect();
        var scaleY = H / rect.height;
        var touchY = (e.touches[0].clientY - rect.top) * scaleY;
        paddle1.y = touchY - PADDLE_H / 2;
    }, { passive: false });

    // ===== SCHRITT 5: Modus wechseln =====

    modeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            modeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            mode = btn.dataset.mode;
            initGame();
        });
    });

    // ===== SCHRITT 6: Spiel initialisieren =====

    function initGame() {
        paddle1 = {
            x: 20,                    // 20px vom linken Rand
            y: H / 2 - PADDLE_H / 2   // Vertikal zentriert
        };

        paddle2 = {
            x: W - 20 - PADDLE_W,     // 20px vom rechten Rand
            y: H / 2 - PADDLE_H / 2
        };

        score1 = 0;
        score2 = 0;
        running = false;
        gameOver = false;

        resetBall();
        draw();
        statusEl.textContent = 'Drücke Leertaste oder tippe zum Starten';
    }

    // ===== SCHRITT 7: Ball zurücksetzen =====

    function resetBall() {
        ball = {
            x: W / 2,           // Mitte des Spielfelds
            y: H / 2,
            vx: 0,              // Geschwindigkeit X (noch 0 = steht still)
            vy: 0               // Geschwindigkeit Y
        };
    }

    function launchBall() {
        /*
          Ball in eine zufällige Richtung starten.

          Math.random() > 0.5 ? 1 : -1
          → 50% Chance nach links (-1) oder rechts (+1)

          (Math.random() - 0.5) * 2
          → Zufallszahl zwischen -1 und +1 (für den Y-Winkel)
        */
        var dirX = Math.random() > 0.5 ? 1 : -1;
        var dirY = (Math.random() - 0.5) * 2;

        // Geschwindigkeit normalisieren (gleiche Gesamtgeschwindigkeit unabhängig vom Winkel)
        var length = Math.sqrt(1 + dirY * dirY);
        /*
          Math.sqrt() = Quadratwurzel
          Normalisierung: Wir teilen durch die "Länge" des Richtungsvektors,
          damit der Ball immer gleich schnell fliegt, egal in welchem Winkel.
          Ohne das wäre ein Ball im 45°-Winkel schneller als einer geradeaus.
        */

        ball.vx = (dirX / length) * BALL_SPEED;
        ball.vy = (dirY / length) * BALL_SPEED;
    }

    // ===== SCHRITT 8: Runde starten =====

    function startRound() {
        if (gameOver) {
            initGame();
            return;
        }
        running = true;
        statusEl.textContent = '';
        launchBall();
        gameLoop();
    }

    // ===== SCHRITT 9: GAME LOOP (Herzstück!) =====

    function gameLoop() {
        if (!running) return;

        update();    // Positionen berechnen
        draw();      // Alles zeichnen

        requestAnimationFrame(gameLoop);
        /*
          requestAnimationFrame() ruft gameLoop() vor dem nächsten Frame auf.
          So entsteht eine Endlosschleife: update → draw → update → draw → ...
          ca. 60 Mal pro Sekunde.
        */
    }

    // ===== SCHRITT 10: Update (Logik pro Frame) =====

    function update() {
        // --- Schläger bewegen ---

        // Spieler 1: W = hoch, S = runter
        if (keys['w']) {
            paddle1.y -= PADDLE_SPEED;
        }
        if (keys['s']) {
            paddle1.y += PADDLE_SPEED;
        }

        // Spieler 2 / CPU
        if (mode === 'local') {
            // 2-Spieler: Pfeiltasten
            if (keys['arrowup']) paddle2.y -= PADDLE_SPEED;
            if (keys['arrowdown']) paddle2.y += PADDLE_SPEED;
        } else {
            // CPU: folgt dem Ball (mit leichter Verzögerung)
            cpuMove();
        }

        // Schläger im Spielfeld halten (nicht über den Rand hinaus)
        paddle1.y = clamp(paddle1.y, 0, H - PADDLE_H);
        paddle2.y = clamp(paddle2.y, 0, H - PADDLE_H);
        /*
          clamp(wert, min, max) begrenzt einen Wert:
          - Wenn wert < min → gibt min zurück
          - Wenn wert > max → gibt max zurück
          - Sonst → gibt wert zurück
        */

        // --- Ball bewegen ---
        ball.x += ball.vx;
        ball.y += ball.vy;

        // --- Kollision mit Ober-/Unterkante ---
        if (ball.y - BALL_SIZE < 0) {
            ball.y = BALL_SIZE;
            ball.vy = -ball.vy;   // Y-Richtung umkehren (abprallen)
        }
        if (ball.y + BALL_SIZE > H) {
            ball.y = H - BALL_SIZE;
            ball.vy = -ball.vy;
        }

        // --- Kollision mit Schlägern ---
        // Linker Schläger (Spieler 1)
        if (ballHitsPaddle(paddle1)) {
            ball.x = paddle1.x + PADDLE_W + BALL_SIZE;  // Ball aus dem Schläger schieben
            bounceOff(paddle1);
        }

        // Rechter Schläger (Spieler 2)
        if (ballHitsPaddle(paddle2)) {
            ball.x = paddle2.x - BALL_SIZE;
            bounceOff(paddle2);
        }

        // --- Punkt! Ball fliegt links/rechts raus ---
        if (ball.x < 0) {
            // Spieler 2 bekommt einen Punkt
            score2++;
            afterPoint();
        }

        if (ball.x > W) {
            // Spieler 1 bekommt einen Punkt
            score1++;
            afterPoint();
        }
    }

    // ===== SCHRITT 11: Kollisionserkennung =====

    function ballHitsPaddle(paddle) {
        /*
          AABB-Kollision (Axis-Aligned Bounding Box):
          Zwei Rechtecke überlappen sich, wenn sie sich in BEIDEN
          Achsen (X und Y) gleichzeitig überlappen.

          Ball-Rechteck: (ball.x - BALL_SIZE) bis (ball.x + BALL_SIZE)
          Schläger-Rechteck: (paddle.x) bis (paddle.x + PADDLE_W)
        */
        return ball.x + BALL_SIZE > paddle.x &&
               ball.x - BALL_SIZE < paddle.x + PADDLE_W &&
               ball.y + BALL_SIZE > paddle.y &&
               ball.y - BALL_SIZE < paddle.y + PADDLE_H;
    }

    // ===== SCHRITT 12: Ball abprallen lassen =====

    function bounceOff(paddle) {
        /*
          Der Abprallwinkel hängt davon ab, WO der Ball den Schläger trifft:

          - Mitte des Schlägers → Ball fliegt fast gerade
          - Kante des Schlägers → Ball fliegt steil

          hitPoint: Wo hat der Ball getroffen?
          -1 = obere Kante, 0 = Mitte, +1 = untere Kante
        */
        var paddleCenter = paddle.y + PADDLE_H / 2;
        var hitPoint = (ball.y - paddleCenter) / (PADDLE_H / 2);
        // hitPoint ist jetzt ein Wert zwischen -1 und +1

        // Maximaler Winkel: 60 Grad (in Radians: PI/3)
        var maxAngle = Math.PI / 3;
        /*
          Math.PI = 3.14159... (die Kreiszahl π)
          Radians = Maßeinheit für Winkel (PI = 180°, PI/3 = 60°)
        */

        var angle = hitPoint * maxAngle;

        // Geschwindigkeit leicht erhöhen (Spiel wird schneller!)
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        speed = Math.min(speed + 0.3, 12);
        // Math.min(a, b) = das kleinere von beiden (Maximalgeschwindigkeit = 12)

        // Neue Richtung berechnen
        var dirX = ball.vx > 0 ? -1 : 1;
        // Wenn der Ball nach rechts flog → jetzt nach links (und umgekehrt)

        ball.vx = dirX * Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        /*
          Math.cos(winkel) = X-Anteil der Richtung
          Math.sin(winkel) = Y-Anteil der Richtung

          cos und sin sind Funktionen aus der Trigonometrie.
          Zusammen erzeugen sie eine Richtung in einem bestimmten Winkel.
          Du musst das nicht im Detail verstehen — merke dir:
          cos = horizontal, sin = vertikal.
        */
    }

    // ===== SCHRITT 13: CPU-Steuerung =====

    function cpuMove() {
        /*
          Einfache KI: Der CPU-Schläger folgt dem Ball.
          Aber nicht perfekt — er hat eine "Reaktionsgeschwindigkeit".
          Je näher der Ball, desto genauer folgt er.
        */
        var paddleCenter = paddle2.y + PADDLE_H / 2;
        var diff = ball.y - paddleCenter;

        // Nur bewegen wenn der Ball auf die CPU zukommt (vx > 0)
        if (ball.vx > 0) {
            // CPU-Geschwindigkeit: proportional zum Abstand, aber begrenzt
            var moveSpeed = Math.min(Math.abs(diff) * 0.1, PADDLE_SPEED - 0.5);
            /*
              Math.abs() = Absolutwert (macht negative Zahlen positiv)
              * 0.1 = nur 10% des Abstands pro Frame (wirkt natürlich)
              Math.min() begrenzt auf knapp unter Spieler-Geschwindigkeit
              → CPU ist gut, aber nicht unschlagbar
            */

            if (diff > 5) {
                paddle2.y += moveSpeed;
            } else if (diff < -5) {
                paddle2.y -= moveSpeed;
            }
        }
    }

    // ===== SCHRITT 14: Nach einem Punkt =====

    function afterPoint() {
        running = false;

        if (score1 >= WIN_SCORE) {
            statusEl.textContent = '🎉 Spieler 1 gewinnt! — Tippe zum Neustarten';
            gameOver = true;
        } else if (score2 >= WIN_SCORE) {
            var winner = mode === 'cpu' ? 'CPU' : 'Spieler 2';
            statusEl.textContent = '🎉 ' + winner + ' gewinnt! — Tippe zum Neustarten';
            gameOver = true;
        } else {
            statusEl.textContent = 'Punkt! Leertaste für nächste Runde';
        }

        resetBall();
        draw();
    }

    // ===== SCHRITT 15: Alles zeichnen =====

    function draw() {
        // Spielfeld löschen (komplett schwarz übermalen)
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);

        // Mittellinie (gestrichelt)
        ctx.setLineDash([8, 8]);
        /*
          setLineDash([Strich, Lücke])
          [8, 8] = 8px Strich, 8px Lücke, 8px Strich, ...
        */
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);      // Startpunkt: Mitte oben
        ctx.lineTo(W / 2, H);      // Endpunkt: Mitte unten
        ctx.stroke();
        ctx.setLineDash([]);        // Gestrichelt wieder ausschalten

        // Punktestand
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = 'bold 64px monospace';
        ctx.textAlign = 'center';
        /*
          textAlign = wo der Text relativ zur X-Position steht
          'center' = Text ist zentriert auf der X-Position
        */
        ctx.fillText(score1, W / 4, 70);
        ctx.fillText(score2, W * 3 / 4, 70);

        // Schläger zeichnen
        ctx.fillStyle = '#76ff03';
        ctx.shadowColor = 'rgba(118, 255, 3, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillRect(paddle1.x, paddle1.y, PADDLE_W, PADDLE_H);
        ctx.fillRect(paddle2.x, paddle2.y, PADDLE_W, PADDLE_H);
        ctx.shadowBlur = 0;

        // Ball zeichnen
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_SIZE, 0, Math.PI * 2);
        /*
          arc(x, y, radius, startWinkel, endWinkel)
          0 bis Math.PI * 2 = voller Kreis (360°)
        */
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ===== SCHRITT 16: Hilfsfunktion =====

    function clamp(value, min, max) {
        // Begrenzt einen Wert auf einen Bereich
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    // ===== START =====
    initGame();
})();
/*
  Das gesamte Spiel ist in einer IIFE eingewickelt:
  (function() { ... })();

  IIFE = Immediately Invoked Function Expression
  = Sofort ausgeführter Funktionsausdruck

  Warum? Damit unsere Variablen (ball, paddle1, etc.)
  PRIVAT sind und nicht mit anderen Scripts kollidieren.
  Ohne IIFE wären alle Variablen global sichtbar.
*/
