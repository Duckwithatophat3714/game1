const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let x = 100;
let y = 100;
const radius = 20;
let speed = 2; // Start with speed 2

let leftPressed = false;
let rightPressed = false;
let upPressed = false;
let downPressed = false;

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

let health = 20;
let maxHealth = 20;
let gameOver = false;

// Add this at the top, after your other variables:
let lastDamageTime = 0;

// --- Add at the top ---
let gameState = 'title'; // 'title', 'playing', 'credits'
let round = 1;

// Add this function to reset the game
function resetGame() {
  x = 100;
  y = 100;
  health = maxHealth;
  gameOver = false;
  // Set speed based on round
  speed = (round === 1) ? 2 : 4;
  // Regenerate pillars and enemies
  pillars.splice(0, pillars.length, ...generatePillars(12));
  spawnEnemies(14);
  projectiles = [];
  drawBall();
}

// Draw health bar
function drawHealthBar() {
  const barWidth = 80;
  const barHeight = 10;
  const xBar = x - barWidth / 2;
  const yBar = y - radius - 18; // 18px above the player
  ctx.fillStyle = '#222';
  ctx.fillRect(xBar - 1, yBar - 1, barWidth + 2, barHeight + 2);
  ctx.fillStyle = '#c33';
  ctx.fillRect(xBar, yBar, barWidth * (health / maxHealth), barHeight);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(xBar, yBar, barWidth, barHeight);
}

// Track mouse position
canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

// Key controls
document.addEventListener('keydown', function(e) {
  if (gameState === 'playing' && e.key === 'Escape') {
    gameState = 'paused';
  } else if (gameState === 'paused' && e.key === 'Escape') {
    gameState = 'playing';
    requestAnimationFrame(drawBall);
  }
  if (e.key === 'a' || e.key === 'ArrowLeft') leftPressed = true;
  if (e.key === 'd' || e.key === 'ArrowRight') rightPressed = true;
  if (e.key === 'w' || e.key === 'ArrowUp') upPressed = true;
  if (e.key === 's' || e.key === 'ArrowDown') downPressed = true;
});
document.addEventListener('keyup', function(e) {
  if (e.key === 'a' || e.key === 'ArrowLeft') leftPressed = false;
  if (e.key === 'd' || e.key === 'ArrowRight') rightPressed = false;
  if (e.key === 'w' || e.key === 'ArrowUp') upPressed = false;
  if (e.key === 's' || e.key === 'ArrowDown') downPressed = false;
});

// Generate random pillars
function generatePillars(count) {
  const pillars = [];
  let attempts = 0;
  while (pillars.length < count && attempts < count * 20) {
    attempts++;
    const width = Math.random() * 80 + 40;
    const height = Math.random() * 120 + 40;
    const px = Math.random() * (canvas.width - width - 40) + 20;
    const py = Math.random() * (canvas.height - height - 40) + 20;

    // Check if this pillar would overlap the player
    const closestX = Math.max(px, Math.min(x, px + width));
    const closestY = Math.max(py, Math.min(y, py + height));
    const dx = x - closestX;
    const dy = y - closestY;
    const overlap = dx * dx + dy * dy < radius * radius + 30 * 30; // 30px buffer

    if (!overlap) {
      pillars.push({ x: px, y: py, width, height });
    }
  }
  return pillars;
}
const pillars = generatePillars(12);

// Projectiles
let projectiles = [];
canvas.addEventListener('mousedown', function(e) {
  if (gameState !== 'playing') return; // Only shoot in game

  if (e.button === 0) {
    const dx = mouseX - x;
    const dy = mouseY - y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return; // Prevent NaN
    const projSpeed = 7;
    const vx = (dx / length) * projSpeed;
    const vy = (dy / length) * projSpeed;
    projectiles.push({ x: x, y: y, radius: 14, vx: vx, vy: vy, life: 300 });
  }
});

// Enemies
let enemies = [];
function spawnEnemies(count) {
  enemies = [];
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.random() * (canvas.width - 36) + 18,
      y: Math.random() * (canvas.height / 2),
      radius: 18,
      speed: 0.7 + Math.random(), // was 1.5 + Math.random() * 2
      alive: true
    });
  }
}
spawnEnemies(14);

// Helper for projectile-pillar collision (circle-rectangle)
function projectileHitsPillar(proj, pillar) {
  const closestX = Math.max(pillar.x, Math.min(proj.x, pillar.x + pillar.width));
  const closestY = Math.max(pillar.y, Math.min(proj.y, pillar.y + pillar.height));
  const dx = proj.x - closestX;
  const dy = proj.y - closestY;
  return dx * dx + dy * dy < proj.radius * proj.radius;
}

// Helper: check if a circle at (ex, ey) with radius er collides with any pillar
function enemyHitsPillar(ex, ey, er) {
  for (const p of pillars) {
    const closestX = Math.max(p.x, Math.min(ex, p.x + p.width));
    const closestY = Math.max(p.y, Math.min(ey, p.y + p.height));
    const dx = ex - closestX;
    const dy = ey - closestY;
    if (dx * dx + dy * dy < er * er) {
      return true;
    }
  }
  return false;
}

// Helper: check if an enemy would overlap with another enemy
function enemyWouldOverlap(enemy, newX, newY) {
  for (const other of enemies) {
    if (other !== enemy && other.alive) {
      const dist = Math.hypot(newX - other.x, newY - other.y);
      if (dist < enemy.radius + other.radius) {
        return true;
      }
    }
  }
  return false;
}

// Helper: check if an enemy would overlap with the player
function enemyWouldOverlapPlayer(newX, newY, enemyRadius) {
  const dist = Math.hypot(newX - x, newY - y);
  return dist < enemyRadius + radius;
}

// Place this OUTSIDE drawBall()
function willCollide(nx, ny) {
  for (const p of pillars) {
    const closestX = Math.max(p.x, Math.min(nx, p.x + p.width));
    const closestY = Math.max(p.y, Math.min(ny, p.y + p.height));
    const dx = nx - closestX;
    const dy = ny - closestY;
    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }
  return false;
}

function drawBall() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- Title Screen ---
  if (gameState === 'title') {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('My Game', canvas.width / 2, canvas.height / 2 - 80);

    ctx.font = '32px sans-serif';
    ctx.fillText('Play', canvas.width / 2, canvas.height / 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width / 2 - 60, canvas.height / 2 - 32, 120, 48);

    ctx.fillText('Credits', canvas.width / 2, canvas.height / 2 + 70);
    ctx.strokeRect(canvas.width / 2 - 60, canvas.height / 2 + 38, 120, 48);

    requestAnimationFrame(drawBall);
    return;
  }

  // --- Credits Screen ---
  if (gameState === 'credits') {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Credits', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '28px sans-serif';
    ctx.fillText('Made by Oban Wilkie', canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = '24px sans-serif';
    ctx.fillText('Click to return', canvas.width / 2, canvas.height / 2 + 60);
    requestAnimationFrame(drawBall);
    return;
  }

  // --- Pause Menu ---
  if (gameState === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - 60);

    ctx.font = '32px sans-serif';
    ctx.fillText('Resume', canvas.width / 2, canvas.height / 2);
    ctx.strokeRect(canvas.width / 2 - 80, canvas.height / 2 - 32, 160, 48);

    ctx.fillText('Replay', canvas.width / 2, canvas.height / 2 + 70);
    ctx.strokeRect(canvas.width / 2 - 80, canvas.height / 2 + 38, 160, 48);

    ctx.fillText('Title Screen', canvas.width / 2, canvas.height / 2 + 140);
    ctx.strokeRect(canvas.width / 2 - 110, canvas.height / 2 + 108, 220, 48);

    return;
  }

  // --- Win Condition ---
  const allEnemiesDead = enemies.every(e => !e.alive);
  if (allEnemiesDead) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '32px sans-serif';
    ctx.fillText('Click to Replay', canvas.width / 2, canvas.height / 2 + 40);

    // Draw rectangle around "Click to Replay"
    const text = 'Click to Replay';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = 38;
    const rectX = canvas.width / 2 - textWidth / 2 - 16;
    const rectY = canvas.height / 2 + 40 - textHeight + 8;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(rectX, rectY, textWidth + 32, textHeight);

    return;
  }

  // --- Game Over ---
  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '32px sans-serif';
    ctx.fillText('Click to Replay', canvas.width / 2, canvas.height / 2 + 40);

    // Draw rectangle around "Click to Replay"
    const text = 'Click to Replay';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = 38;
    const rectX = canvas.width / 2 - textWidth / 2 - 16;
    const rectY = canvas.height / 2 + 40 - textHeight + 8;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(rectX, rectY, textWidth + 32, textHeight);

    return;
  }

  // --- Main Game Rendering and Logic ---

  // Handle player movement
  let nx = x;
  let ny = y;
  if (leftPressed && x - radius > 0) nx -= speed;
  if (rightPressed && x + radius < canvas.width) nx += speed;
  if (upPressed && y - radius > 0) ny -= speed;
  if (downPressed && y + radius < canvas.height) ny += speed;
  if (!willCollide(nx, ny)) {
    x = nx;
    y = ny;
  }

  // Draw pillars
  for (const p of pillars) {
    ctx.fillStyle = '#444';
    ctx.fillRect(p.x, p.y, p.width, p.height);
  }

  // Draw player
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'red';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'white';
  ctx.stroke();
  ctx.closePath();

  // Draw gun pointing at mouse
  const gunLength = 28;
  const gunWidth = 8;
  const angle = Math.atan2(mouseY - y, mouseX - x);
  const gunX1 = x + Math.cos(angle) * (radius - 2);
  const gunY1 = y + Math.sin(angle) * (radius - 2);
  const gunX2 = x + Math.cos(angle) * (radius + gunLength);
  const gunY2 = y + Math.sin(angle) * (radius + gunLength);

  // Draw the gun as a thick line
  ctx.save();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = gunWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(gunX1, gunY1);
  ctx.lineTo(gunX2, gunY2);
  ctx.stroke();
  ctx.restore();

  // Draw health bar
  drawHealthBar();

  // Draw enemies
  for (const enemy of enemies) {
    if (enemy.alive) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'blue';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.closePath();

      // Enemy movement toward player, avoiding pillars and other enemies
      let dx = x - enemy.x;
      let dy = y - enemy.y;
      let dist = Math.hypot(dx, dy);
      let vx = (dx / dist) * enemy.speed;
      let vy = (dy / dist) * enemy.speed;
      let nextX = enemy.x + vx;
      let nextY = enemy.y + vy;
      if (
        !enemyHitsPillar(nextX, nextY, enemy.radius) &&
        !enemyWouldOverlap(enemy, nextX, nextY) &&
        !enemyWouldOverlapPlayer(nextX, nextY, enemy.radius)
      ) {
        enemy.x = nextX;
        enemy.y = nextY;
      } else if (
        !enemyHitsPillar(enemy.x + vx, enemy.y, enemy.radius) &&
        !enemyWouldOverlap(enemy, enemy.x + vx, enemy.y) &&
        !enemyWouldOverlapPlayer(enemy.x + vx, enemy.y, enemy.radius)
      ) {
        enemy.x += vx;
      } else if (
        !enemyHitsPillar(enemy.x, enemy.y + vy, enemy.radius) &&
        !enemyWouldOverlap(enemy, enemy.x, enemy.y + vy) &&
        !enemyWouldOverlapPlayer(enemy.x, enemy.y + vy, enemy.radius)
      ) {
        enemy.y += vy;
      } else {
        // Only respawn if stuck NOT because of the player
        if (
          !enemyWouldOverlapPlayer(nextX, nextY, enemy.radius) &&
          !enemyWouldOverlapPlayer(enemy.x + vx, enemy.y, enemy.radius) &&
          !enemyWouldOverlapPlayer(enemy.x, enemy.y + vy, enemy.radius)
        ) {
          enemy.x = Math.random() * (canvas.width - 2 * enemy.radius) + enemy.radius;
          enemy.y = -enemy.radius;
          enemy.speed = 0.7 + Math.random();
        }
        // Otherwise, just stay put (blocked by player)
      }

      // Damage player if touching
      if (Math.hypot(enemy.x - x, enemy.y - y) < enemy.radius + radius) {
        const now = performance.now();
        if (now - lastDamageTime > 100) {
          health -= 2;
          lastDamageTime = now;
          if (health <= 0) {
            health = 0;
            gameOver = true;
          }
        }
      }
    }
  }

  // Draw and update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    // Move projectile
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.life--;

    // Draw projectile
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.closePath();

    // Remove if out of bounds or life expired
    if (
      proj.x < 0 || proj.x > canvas.width ||
      proj.y < 0 || proj.y > canvas.height ||
      proj.life <= 0
    ) {
      projectiles.splice(i, 1);
      continue;
    }

    // Check collision with enemies
    for (const enemy of enemies) {
      if (
        enemy.alive &&
        Math.hypot(proj.x - enemy.x, proj.y - enemy.y) < proj.radius + enemy.radius
      ) {
        enemy.alive = false; // Enemy dies
        projectiles.splice(i, 1);
        break;
      }
    }
  }

  requestAnimationFrame(drawBall);
}

// --- Clean click handler ---
canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (gameState === 'title') {
    // Play button
    if (
      mx > canvas.width / 2 - 60 && mx < canvas.width / 2 + 60 &&
      my > canvas.height / 2 - 32 && my < canvas.height / 2 + 16
    ) {
      gameState = 'playing';
      round = 1;
      resetGame();
      return;
    }
    // Credits button
    if (
      mx > canvas.width / 2 - 60 && mx < canvas.width / 2 + 60 &&
      my > canvas.height / 2 + 38 && my < canvas.height / 2 + 86
    ) {
      gameState = 'credits';
      return;
    }
  } else if (gameState === 'credits') {
    gameState = 'title';
    return;
  } else if (gameState === 'paused') {
    // Resume button
    if (
      mx > canvas.width / 2 - 80 && mx < canvas.width / 2 + 80 &&
      my > canvas.height / 2 - 32 && my < canvas.height / 2 + 16
    ) {
      gameState = 'playing';
      requestAnimationFrame(drawBall);
      return;
    }
    // Replay button
    if (
      mx > canvas.width / 2 - 80 && mx < canvas.width / 2 + 80 &&
      my > canvas.height / 2 + 38 && my < canvas.height / 2 + 86
    ) {
      round++;
      resetGame();
      gameState = 'playing';
      return;
    }
    // Title Screen button
    if (
      mx > canvas.width / 2 - 110 && mx < canvas.width / 2 + 110 &&
      my > canvas.height / 2 + 108 && my < canvas.height / 2 + 156
    ) {
      gameState = 'title';
      requestAnimationFrame(drawBall);
      return;
    }
  } else {
    const allEnemiesDead = enemies.every(e => !e.alive);
    if (gameOver || allEnemiesDead) {
      round++;
      resetGame();
    }
  }
});

drawBall();
