(function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highscoreEl = document.getElementById('highscore');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayMessage = document.getElementById('overlayMessage');

    const GRID = 20;
    const TILE = canvas.width / GRID;

    let snake, direction, nextDirection, food, score, highscore, speed, gameLoop, running;

    highscore = parseInt(localStorage.getItem('snakeHighscore')) || 0;
    highscoreEl.textContent = highscore;

    function init() {
        snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        speed = 130;
        scoreEl.textContent = score;
        placeFood();
    }

    function placeFood() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID)
            };
        } while (snake.some(s => s.x === pos.x && s.y === pos.y));
        food = pos;
    }

    function update() {
        direction = nextDirection;

        const head = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };

        // Wandkollision
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
            return gameOver();
        }

        // Selbstkollision
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            return gameOver();
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            scoreEl.textContent = score;
            placeFood();
            // Schneller werden
            if (speed > 60) {
                speed -= 2;
            }
            clearInterval(gameLoop);
            gameLoop = setInterval(update, speed);
        } else {
            snake.pop();
        }

        draw();
    }

    function draw() {
        // Hintergrund
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gitter (subtil)
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < GRID; i++) {
            ctx.beginPath();
            ctx.moveTo(i * TILE, 0);
            ctx.lineTo(i * TILE, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * TILE);
            ctx.lineTo(canvas.width, i * TILE);
            ctx.stroke();
        }

        // Schlange
        snake.forEach(function (seg, i) {
            const ratio = 1 - i / snake.length;
            const green = Math.floor(180 + 75 * ratio);
            ctx.fillStyle = 'rgb(0,' + green + ',80)';
            ctx.shadowColor = i === 0 ? 'rgba(0,255,136,0.6)' : 'transparent';
            ctx.shadowBlur = i === 0 ? 10 : 0;
            roundRect(ctx, seg.x * TILE + 1, seg.y * TILE + 1, TILE - 2, TILE - 2, 4);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Augen auf dem Kopf
        var head = snake[0];
        ctx.fillStyle = '#fff';
        var eyeSize = 3;
        var eyeOffsetX = direction.x === 0 ? 5 : (direction.x > 0 ? 11 : 3);
        var eyeOffsetY = direction.y === 0 ? 5 : (direction.y > 0 ? 11 : 3);

        if (direction.x !== 0) {
            ctx.beginPath();
            ctx.arc(head.x * TILE + eyeOffsetX, head.y * TILE + 6, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(head.x * TILE + eyeOffsetX, head.y * TILE + 14, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(head.x * TILE + 6, head.y * TILE + eyeOffsetY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(head.x * TILE + 14, head.y * TILE + eyeOffsetY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Essen
        ctx.shadowColor = 'rgba(255,50,50,0.7)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(food.x * TILE + TILE / 2, food.y * TILE + TILE / 2, TILE / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

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

    function gameOver() {
        running = false;
        clearInterval(gameLoop);

        if (score > highscore) {
            highscore = score;
            localStorage.setItem('snakeHighscore', highscore);
            highscoreEl.textContent = highscore;
        }

        overlayTitle.textContent = 'Game Over';
        overlayMessage.textContent = 'Score: ' + score + ' — Nochmal spielen?';
        overlay.classList.remove('hidden');
    }

    function start() {
        if (running) return;
        running = true;
        overlay.classList.add('hidden');
        init();
        draw();
        gameLoop = setInterval(update, speed);
    }

    // Tastatursteuerung
    document.addEventListener('keydown', function (e) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (direction.y === 0) nextDirection = { x: 0, y: -1 };
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (direction.y === 0) nextDirection = { x: 0, y: 1 };
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (direction.x === 0) nextDirection = { x: -1, y: 0 };
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (direction.x === 0) nextDirection = { x: 1, y: 0 };
                e.preventDefault();
                break;
            case ' ':
                if (!running) start();
                e.preventDefault();
                break;
        }
    });

    // Touch/Klick zum Starten
    overlay.addEventListener('click', function () {
        if (!running) start();
    });

    // Mobile Buttons
    document.getElementById('btnUp').addEventListener('click', function () {
        if (!running) { start(); return; }
        if (direction.y === 0) nextDirection = { x: 0, y: -1 };
    });
    document.getElementById('btnDown').addEventListener('click', function () {
        if (!running) { start(); return; }
        if (direction.y === 0) nextDirection = { x: 0, y: 1 };
    });
    document.getElementById('btnLeft').addEventListener('click', function () {
        if (!running) { start(); return; }
        if (direction.x === 0) nextDirection = { x: -1, y: 0 };
    });
    document.getElementById('btnRight').addEventListener('click', function () {
        if (!running) { start(); return; }
        if (direction.x === 0) nextDirection = { x: 1, y: 0 };
    });

    // Swipe-Steuerung
    var touchStartX = 0;
    var touchStartY = 0;

    canvas.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        if (!running) start();
    }, { passive: true });

    canvas.addEventListener('touchmove', function (e) {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && direction.x === 0) nextDirection = { x: 1, y: 0 };
            else if (dx < 0 && direction.x === 0) nextDirection = { x: -1, y: 0 };
        } else {
            if (dy > 0 && direction.y === 0) nextDirection = { x: 0, y: 1 };
            else if (dy < 0 && direction.y === 0) nextDirection = { x: 0, y: -1 };
        }
    }, { passive: true });

    // Initial draw
    init();
    draw();
})();
