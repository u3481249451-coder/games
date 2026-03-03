/*
  Flappy Bird Clone

  Neue Konzepte:

  - GRAVITATION & AUFTRIEB:
    ==========================================
    Der Vogel fällt ständig nach unten (Gravitation).
    Jeder Frame: velocity += gravity (wird schneller)
    Bei Tastendruck: velocity = -flapStrength (nach oben geschleudert)

    Das ist echte Physik! Genau wie ein Ball der hochgeworfen wird:
    Er wird immer langsamer, stoppt kurz, und fällt dann wieder.

  - PARALLAX-SCROLLING:
    ==========================================
    Verschiedene Ebenen bewegen sich unterschiedlich schnell:
    - Hintergrund (Himmel): steht still
    - Wolken: langsam
    - Rohre: normal
    - Boden: schnell

    Das erzeugt einen 3D-Tiefeneffekt, obwohl alles 2D ist.
    Objekte die "weiter weg" sind bewegen sich langsamer.

  - OBJEKT-POOL (Rohre wiederverwenden):
    ==========================================
    Statt ständig neue Rohre zu erstellen und alte zu löschen,
    verschieben wir Rohre die links rausgeflogen sind nach rechts.
    Das ist speicherfreundlicher (weniger Müll für den Browser).

  - ZUSTANDSMASCHINE (State Machine):
    ==========================================
    Das Spiel hat klare Zustände:
    - 'ready'   → Startbildschirm, wartet auf Input
    - 'playing' → Spiel läuft
    - 'dead'    → Vogel ist gestorben, wartet auf Neustart

    Jeder Zustand hat eigene Regeln für Update und Zeichnen.
    Das verhindert Bugs wie "Vogel kann nach dem Tod noch fliegen".
*/

(function () {
    // ===== SCHRITT 1: Setup =====

    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('best');
    var statusEl = document.getElementById('status');

    var W = canvas.width;    // 320
    var H = canvas.height;   // 480

    // ===== SCHRITT 2: Konstanten =====

    var GRAVITY = 0.4;        // Wie stark der Vogel fällt (Pixel/Frame²)
    var FLAP_STRENGTH = 7;    // Wie stark ein Flügelschlag ist
    var PIPE_WIDTH = 52;      // Breite eines Rohrs
    var PIPE_GAP = 130;       // Lücke zwischen oberem und unterem Rohr
    var PIPE_SPEED = 2.5;     // Wie schnell die Rohre nach links wandern
    var PIPE_SPAWN = 180;     // Abstand zwischen Rohren (in Pixeln)
    var GROUND_H = 60;        // Höhe des Bodens
    var BIRD_SIZE = 18;       // Vogelgröße (Radius)
    var BIRD_X = 80;          // X-Position des Vogels (bleibt konstant!)

    // ===== SCHRITT 3: Spielvariablen =====

    var state;       // 'ready', 'playing', 'dead'
    var bird;        // { y, velocity, rotation }
    var pipes;       // Array von { x, topH } Objekten
    var score;
    var best;
    var groundX;     // X-Offset für scrollenden Boden
    var cloudX;      // X-Offset für scrollende Wolken
    var frameCount;  // Zählt die Frames (für Animationen)

    // Bestleistung laden
    best = parseInt(localStorage.getItem('flappyBest')) || 0;
    bestEl.textContent = best;

    // ===== SCHRITT 4: Farben (Retro-Palette) =====

    /*
      Wir definieren alle Farben an einem Ort.
      Vorteil: Um den Look zu ändern, müssen wir nur HIER ändern.
      Das nennt man "Single Source of Truth" (eine einzige Wahrheitsquelle).
    */
    var COLORS = {
        sky: '#4ec0ca',        // Himmelblau
        skyBottom: '#d4f0f0',  // Hellblau (unten)
        ground: '#ded895',     // Sandig
        groundDark: '#dab85e', // Dunklerer Sand
        pipe: '#73bf2e',       // Rohre grün
        pipeDark: '#568f22',   // Rohr-Schatten
        pipeEdge: '#5a9e24',   // Rohr-Kante
        bird: '#f5c842',       // Vogel gelb
        birdDark: '#e8a319',   // Vogel-Schatten
        birdBeak: '#ff6b35',   // Schnabel orange
        birdEye: '#fff',       // Auge weiß
        cloud: 'rgba(255,255,255,0.6)'
    };

    // ===== SCHRITT 5: Eingabe =====

    function flap() {
        if (state === 'ready') {
            state = 'playing';
            statusEl.textContent = '';
            bird.velocity = -FLAP_STRENGTH;
        } else if (state === 'playing') {
            bird.velocity = -FLAP_STRENGTH;
            /*
              Negativer Wert = nach oben!
              In Canvas ist Y=0 oben und Y=480 unten.
              Also: negatives velocity = Vogel steigt.
            */
        } else if (state === 'dead') {
            initGame();
        }
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'ArrowUp') {
            e.preventDefault();
            flap();
        }
    });
    canvas.addEventListener('click', flap);
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        flap();
    });

    // ===== SCHRITT 6: Spiel initialisieren =====

    function initGame() {
        state = 'ready';
        bird = {
            y: H / 2 - 30,   // Leicht über der Mitte
            velocity: 0,       // Anfangs steht der Vogel still
            rotation: 0        // Neigungswinkel (in Radians)
        };
        pipes = [];
        score = 0;
        groundX = 0;
        cloudX = 0;
        frameCount = 0;

        scoreEl.textContent = '0';
        statusEl.textContent = 'Tippe, klicke oder drücke Leertaste';
        gameLoop();
    }

    // ===== SCHRITT 7: Game Loop =====

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // ===== SCHRITT 8: Update =====

    function update() {
        frameCount++;

        // Parallax: Boden und Wolken scrollen immer (auch im Menü)
        if (state !== 'dead') {
            groundX -= PIPE_SPEED;
            if (groundX <= -48) groundX = 0;
            // Wenn der Boden 48px gescrollt hat → zurücksetzen (nahtlose Wiederholung)

            cloudX -= 0.5;
            // Wolken bewegen sich langsamer → Parallax-Effekt!
            if (cloudX <= -W) cloudX = 0;
        }

        if (state === 'ready') {
            // Vogel schwebt leicht auf und ab (Sinus-Welle)
            bird.y = H / 2 - 30 + Math.sin(frameCount * 0.08) * 8;
            /*
              Math.sin() gibt Werte zwischen -1 und +1 in einer Wellenbewegung.
              frameCount * 0.08 = Geschwindigkeit der Welle
              * 8 = Amplitude (wie weit hoch/runter)
              Ergebnis: sanftes Auf-und-Ab-Schweben
            */
            return;
        }

        if (state === 'dead') return;

        // --- PHYSIK: Gravitation ---
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;
        /*
          Frame 1: velocity = -7 (Flap), y sinkt um 7 → Vogel steigt
          Frame 2: velocity = -6.6 (+0.4 Gravity), y sinkt um 6.6 → steigt langsamer
          Frame 3: velocity = -6.2, ...
          ...
          Frame 18: velocity = 0 → Vogel stoppt kurz
          Frame 19: velocity = +0.4 → Vogel beginnt zu fallen
          Frame 20: velocity = +0.8 → fällt schneller
          ...
          Das ist exakt wie ein Ball der hochgeworfen wird!
        */

        // Vogel-Neigung basierend auf Geschwindigkeit
        bird.rotation = Math.min(bird.velocity * 0.08, Math.PI / 4);
        /*
          Steigt der Vogel? → velocity negativ → Nase nach oben
          Fällt er? → velocity positiv → Nase nach unten
          Math.PI / 4 = max 45° nach unten
        */

        // --- ROHRE ---
        // Neue Rohre erzeugen
        if (pipes.length === 0 || pipes[pipes.length - 1].x < W - PIPE_SPAWN) {
            spawnPipe();
        }

        // Rohre bewegen
        for (var i = pipes.length - 1; i >= 0; i--) {
            var pipe = pipes[i];
            pipe.x -= PIPE_SPEED;

            // Punkt zählen wenn Vogel ein Rohr passiert
            if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
                pipe.scored = true;
                score++;
                scoreEl.textContent = score;
            }

            // Rohr links raus → entfernen
            if (pipe.x + PIPE_WIDTH < -10) {
                pipes.splice(i, 1);
            }
        }

        // --- KOLLISIONEN ---
        // Boden oder Decke?
        if (bird.y + BIRD_SIZE > H - GROUND_H || bird.y - BIRD_SIZE < 0) {
            die();
            return;
        }

        // Rohre?
        for (var i = 0; i < pipes.length; i++) {
            if (checkPipeCollision(pipes[i])) {
                die();
                return;
            }
        }
    }

    // ===== SCHRITT 9: Rohr erzeugen =====

    function spawnPipe() {
        /*
          topH = Höhe des oberen Rohrs (zufällig).
          Die Lücke beginnt bei topH und endet bei topH + PIPE_GAP.

          Wir begrenzen topH, damit die Lücke nicht zu nah am
          Boden oder an der Decke ist.
        */
        var minTop = 60;
        var maxTop = H - GROUND_H - PIPE_GAP - 60;
        var topH = minTop + Math.random() * (maxTop - minTop);

        pipes.push({
            x: W + 10,       // Startet rechts außerhalb des Bildschirms
            topH: topH,
            scored: false
        });
    }

    // ===== SCHRITT 10: Rohr-Kollision =====

    function checkPipeCollision(pipe) {
        /*
          Wir prüfen ob der Vogel (Kreis) eines der beiden Rohre berührt:

          Oberes Rohr: von x=pipe.x, y=0 bis x=pipe.x+PIPE_WIDTH, y=pipe.topH
          Unteres Rohr: von x=pipe.x, y=pipe.topH+PIPE_GAP bis Boden

          Vereinfachte Kollision: Wir behandeln den Vogel als Rechteck
          (etwas kleiner als sein visueller Kreis für faireres Gameplay).
        */
        var birdLeft = BIRD_X - BIRD_SIZE + 4;   // +4 = kleiner Puffer (fairer)
        var birdRight = BIRD_X + BIRD_SIZE - 4;
        var birdTop = bird.y - BIRD_SIZE + 4;
        var birdBottom = bird.y + BIRD_SIZE - 4;

        // Ist der Vogel horizontal im Rohr-Bereich?
        if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
            // Oberes Rohr berührt?
            if (birdTop < pipe.topH) return true;
            // Unteres Rohr berührt?
            if (birdBottom > pipe.topH + PIPE_GAP) return true;
        }

        return false;
    }

    // ===== SCHRITT 11: Sterben =====

    function die() {
        state = 'dead';

        if (score > best) {
            best = score;
            localStorage.setItem('flappyBest', best);
            bestEl.textContent = best;
        }

        statusEl.textContent = 'Game Over! Score: ' + score + ' — Tippe zum Neustarten';
    }

    // ===== SCHRITT 12: Zeichnen =====

    function draw() {
        // --- Himmel (Gradient von oben nach unten) ---
        var skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
        /*
          createLinearGradient(x1, y1, x2, y2)
          Erzeugt einen Farbverlauf von Punkt (x1,y1) zu Punkt (x2,y2).
          Dann fügen wir Farbstopps hinzu:
        */
        skyGrad.addColorStop(0, COLORS.sky);
        // Position 0 = Anfang (oben) → Himmelblau
        skyGrad.addColorStop(1, COLORS.skyBottom);
        // Position 1 = Ende (unten) → Hellblau

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // --- Wolken (Parallax) ---
        drawClouds();

        // --- Rohre ---
        for (var i = 0; i < pipes.length; i++) {
            drawPipe(pipes[i]);
        }

        // --- Boden ---
        drawGround();

        // --- Vogel ---
        drawBird();

        // --- Score groß in der Mitte (während des Spielens) ---
        if (state === 'playing') {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 3;
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeText(score, W / 2, 70);
            ctx.fillText(score, W / 2, 70);
            /*
              strokeText() = Text-Umrandung zeichnen
              fillText() = Text-Füllung zeichnen
              Zusammen ergibt das Text mit Kontur (besser lesbar)
            */
        }
    }

    // ===== SCHRITT 13: Wolken zeichnen =====

    function drawClouds() {
        ctx.fillStyle = COLORS.cloud;

        // Wir zeichnen ein paar Wolken an festen Positionen,
        // die sich mit cloudX verschieben
        var clouds = [
            { x: 40, y: 60, r: 25 },
            { x: 170, y: 100, r: 30 },
            { x: 280, y: 45, r: 20 },
            { x: 100, y: 150, r: 22 }
        ];

        for (var i = 0; i < clouds.length; i++) {
            var c = clouds[i];
            var cx = ((c.x + cloudX) % (W + 60)) + 30;
            /*
              % (Modulo) lässt die Wolke nahtlos wiederholen:
              Wenn sie links rausfliegt, erscheint sie rechts wieder.
            */
            if (cx < -30) cx += W + 60;

            // Wolke = 3 überlappende Kreise
            ctx.beginPath();
            ctx.arc(cx, c.y, c.r, 0, Math.PI * 2);
            ctx.arc(cx + c.r * 0.8, c.y - c.r * 0.3, c.r * 0.7, 0, Math.PI * 2);
            ctx.arc(cx - c.r * 0.6, c.y + c.r * 0.1, c.r * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== SCHRITT 14: Rohr zeichnen =====

    function drawPipe(pipe) {
        var x = pipe.x;
        var topH = pipe.topH;
        var bottomY = topH + PIPE_GAP;

        // --- Oberes Rohr (Körper) ---
        ctx.fillStyle = COLORS.pipe;
        ctx.fillRect(x, 0, PIPE_WIDTH, topH);

        // Schatten auf der rechten Seite (3D-Effekt)
        ctx.fillStyle = COLORS.pipeDark;
        ctx.fillRect(x + PIPE_WIDTH - 8, 0, 8, topH);

        // Highlight auf der linken Seite
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 4, 0, 6, topH);

        // Kappe oben (breiter als der Körper)
        var capW = PIPE_WIDTH + 8;
        var capH = 24;
        var capX = x - 4;
        ctx.fillStyle = COLORS.pipeEdge;
        ctx.fillRect(capX, topH - capH, capW, capH);
        ctx.fillStyle = COLORS.pipe;
        ctx.fillRect(capX + 2, topH - capH + 2, capW - 4, capH - 4);

        // --- Unteres Rohr ---
        ctx.fillStyle = COLORS.pipe;
        ctx.fillRect(x, bottomY, PIPE_WIDTH, H - GROUND_H - bottomY);

        ctx.fillStyle = COLORS.pipeDark;
        ctx.fillRect(x + PIPE_WIDTH - 8, bottomY, 8, H - GROUND_H - bottomY);

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 4, bottomY, 6, H - GROUND_H - bottomY);

        // Kappe unten
        ctx.fillStyle = COLORS.pipeEdge;
        ctx.fillRect(capX, bottomY, capW, capH);
        ctx.fillStyle = COLORS.pipe;
        ctx.fillRect(capX + 2, bottomY + 2, capW - 4, capH - 4);
    }

    // ===== SCHRITT 15: Boden zeichnen =====

    function drawGround() {
        var groundY = H - GROUND_H;

        // Hauptfläche
        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(0, groundY, W, GROUND_H);

        // Obere Kante (dunkler)
        ctx.fillStyle = COLORS.groundDark;
        ctx.fillRect(0, groundY, W, 4);

        // Muster auf dem Boden (scrollende Striche)
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 2;
        for (var i = 0; i < W + 48; i += 24) {
            var gx = ((i + groundX) % (W + 48)) - 24;
            ctx.beginPath();
            ctx.moveTo(gx, groundY + 12);
            ctx.lineTo(gx + 12, groundY + 20);
            ctx.stroke();
        }
    }

    // ===== SCHRITT 16: Vogel zeichnen =====

    function drawBird() {
        ctx.save();
        /*
          ctx.save() speichert den aktuellen Zeichenzustand.
          Danach können wir Transformationen (Drehung, Verschiebung) machen,
          und mit ctx.restore() alles zurücksetzen.

          Ohne save/restore würde die Drehung ALLES danach beeinflussen!
        */

        ctx.translate(BIRD_X, bird.y);
        /*
          translate(x, y) verschiebt den Ursprung (0,0) des Zeichensystems.
          Jetzt ist (0,0) dort wo der Vogel ist.
          Das macht die Drehung einfacher — der Vogel dreht sich um sich selbst.
        */

        ctx.rotate(bird.rotation);
        /*
          rotate(winkel) dreht alles was danach gezeichnet wird.
          Positiv = im Uhrzeigersinn (Nase runter)
          Negativ = gegen den Uhrzeigersinn (Nase hoch)
        */

        // Körper (Kreis)
        ctx.fillStyle = COLORS.bird;
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_SIZE, 0, Math.PI * 2);
        ctx.fill();

        // Schatten unten
        ctx.fillStyle = COLORS.birdDark;
        ctx.beginPath();
        ctx.arc(0, 2, BIRD_SIZE, 0, Math.PI);
        // 0 bis Math.PI = nur die untere Hälfte des Kreises
        ctx.fill();

        // Flügel (animiert)
        var wingOffset = Math.sin(frameCount * 0.3) * 4;
        // Sinus für flatternde Bewegung

        ctx.fillStyle = COLORS.birdDark;
        ctx.beginPath();
        ctx.ellipse(-2, wingOffset, 10, 6, -0.3, 0, Math.PI * 2);
        /*
          ellipse(x, y, radiusX, radiusY, rotation, startWinkel, endWinkel)
          Wie arc(), aber mit unterschiedlichen X- und Y-Radien → Oval
        */
        ctx.fill();

        // Auge
        ctx.fillStyle = COLORS.birdEye;
        ctx.beginPath();
        ctx.arc(8, -5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pupille
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(10, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Schnabel
        ctx.fillStyle = COLORS.birdBeak;
        ctx.beginPath();
        ctx.moveTo(12, -1);
        ctx.lineTo(22, 2);
        ctx.lineTo(12, 5);
        /*
          moveTo + lineTo = Pfad zeichnen (wie "Malen nach Zahlen")
          3 Punkte → Dreieck (der Schnabel)
        */
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        // Zeichenzustand zurücksetzen (Drehung & Verschiebung rückgängig)
    }

    // ===== START =====
    initGame();
})();
