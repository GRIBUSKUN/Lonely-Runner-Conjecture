import { Application, Graphics } from "pixi.js";

type Player = {
  speed: number;
  angle: number;
  hasBeenLonely: boolean;
  color: number;
  sprite: Graphics;
  arc: Graphics;
};

// Create a new application
const app = new Application();

// Initialize the application
await app.init({
  resizeTo: window,
  background: "#1099bb00",
  backgroundAlpha: 0,
});
const pixiContainer = document.getElementById("pixi-container")!;
pixiContainer.appendChild(app.canvas);

const playerCountInput = document.getElementById(
  "player-count",
) as HTMLInputElement;
const speedMultiplierInput = document.getElementById(
  "speed-multiplier",
) as HTMLInputElement;
const speedMultiplierValue = document.getElementById("speed-multiplier-value")!;
const lonelyCountSpan = document.getElementById("lonely-count")!;
const totalCountSpan = document.getElementById("player-total")!;
const thresholdSpan = document.getElementById("lonely-threshold")!;
const speedListSpan = document.getElementById("speed-list")!;
const statusText = document.getElementById("status-text")!;
const restartButton = document.getElementById(
  "restart-button",
) as HTMLButtonElement;
const randomizeSpeedsButton = document.getElementById(
  "randomize-speeds-button",
) as HTMLButtonElement;

const rad = 200;
const players: Player[] = [];
const config = {
  playerCount: Number(playerCountInput.value) || 5,
  speedMultiplier: Number(speedMultiplierInput.value) || 0.01,
};

const centered = {
  x: () => app.screen.width / 2,
  y: () => app.screen.height / 2,
};

const rColor = () => Math.floor(Math.random() * 0xffffff);
const formatSpeed = (value: number) => value.toFixed(4);

function updateControlValues() {
  playerCountInput.value = String(config.playerCount);
  speedMultiplierInput.value = String(config.speedMultiplier);
  speedMultiplierValue.textContent = formatSpeed(config.speedMultiplier);
  thresholdSpan.textContent = String(Math.round(360 / config.playerCount));
  totalCountSpan.textContent = String(config.playerCount);
}

function angularDistance(angle1: number, angle2: number): number {
  // 1. Convert degrees to radians
  const r1 = angle1;
  const r2 = angle2;

  // 2. Use trig identities to find the sine and cosine of the difference
  // This is essentially the Dot Product and Cross Product of two unit vectors
  const y = Math.sin(r1) * Math.cos(r2) - Math.cos(r1) * Math.sin(r2);
  const x = Math.cos(r1) * Math.cos(r2) + Math.sin(r1) * Math.sin(r2);

  // 3. atan2 returns the angle in radians between -PI and PI
  const distance = Math.atan2(y, x);

  // 4. Convert back to degrees
  return Math.abs(distance * (180 / Math.PI));
}

function findTheNearestRunnerAngle(
  target: number,
  others: Player[],
  exclude?: Player,
): number {
  const candidates = others.filter((player) => player !== exclude);
  if (candidates.length === 0) {
    return target;
  }

  return candidates.reduce((closest, current) => {
    const distToClosest = angularDistance(target, closest.angle);
    const distToCurrent = angularDistance(target, current.angle);
    return distToCurrent < distToClosest ? current : closest;
  }).angle;
}

function createTrack() {
  const track = new Graphics()
    .arc(centered.x(), centered.y(), rad, Math.PI, Math.PI * 4, false)
    .stroke({ color: 0xffffff, width: 25 });
  app.stage.addChild(track);
}

function createPlayer(speed: number, color: number): Player {
  const sprite = new Graphics().circle(0, 0, 10).fill(color);

  const arc = new Graphics();
  app.stage.addChild(arc, sprite);

  return {
    speed,
    angle: 0,
    hasBeenLonely: false,
    color,
    sprite,
    arc,
  };
}

function resetPlayers() {
  app.stage.removeChildren();
  players.length = 0;
  createTrack();

  const speeds: number[] = [];
  while (speeds.length < config.playerCount) {
    speeds.push(0.002 + Math.random() * config.speedMultiplier);
  }

  for (let i = 0; i < config.playerCount; i += 1) {
    players.push(createPlayer(speeds[i], rColor()));
  }

  updateControlValues();
  updateStatusPanel();
  app.ticker.start();
}

function updateStatusPanel() {
  const lonelyCount = players.filter((player) => player.hasBeenLonely).length;
  lonelyCountSpan.textContent = String(lonelyCount);
  speedListSpan.textContent = players
    .map((player) => formatSpeed(player.speed))
    .join(", ");
}

function refreshSpeeds() {
  players.forEach((player) => {
    player.speed = 0.002 + Math.random() * config.speedMultiplier;
  });
  updateStatusPanel();
}

function setStatusMessage(message: string) {
  statusText.textContent = message;
}

playerCountInput.addEventListener("change", () => {
  const value = Number(playerCountInput.value);
  config.playerCount = value > 0 ? value : config.playerCount;
  resetPlayers();
});

speedMultiplierInput.addEventListener("input", () => {
  config.speedMultiplier = Number(speedMultiplierInput.value);
  updateControlValues();
});

restartButton.addEventListener("click", () => {
  resetPlayers();
  setStatusMessage("Simulation restarted.");
});

randomizeSpeedsButton.addEventListener("click", () => {
  refreshSpeeds();
  setStatusMessage("Speeds randomized.");
});

resetPlayers();

app.ticker.add(() => {
  const minDistance = 360 / config.playerCount;
  const x = centered.x();
  const y = centered.y();

  let lonelyCount = 0;
  players.forEach((player, index) => {
    player.angle = (player.angle + player.speed) % (2 * Math.PI);
    player.sprite.x = x + Math.cos(player.angle) * rad;
    player.sprite.y = y + Math.sin(player.angle) * rad;

    if (!player.hasBeenLonely) {
      const isLonely = players
        .filter((other) => other !== player)
        .every(
          (other) => angularDistance(other.angle, player.angle) >= minDistance,
        );
      if (isLonely) {
        player.hasBeenLonely = true;
      }
    }

    const fillColor = player.hasBeenLonely ? 0x000000 : player.color;
    player.sprite.clear().circle(0, 0, 10).fill(fillColor);

    const nearestAngle = findTheNearestRunnerAngle(
      player.angle,
      players,
      player,
    );
    const arcLength =
      (nearestAngle - player.angle + 2 * Math.PI) % (2 * Math.PI);
    const [startAngle, endAngle] =
      arcLength > Math.PI
        ? [nearestAngle, player.angle]
        : [player.angle, nearestAngle];
    if (!player.hasBeenLonely) {
      player.arc.clear();
      player.arc.arc(0, 0, 220 + index * 10, startAngle, endAngle);
      player.arc.stroke({ color: fillColor, width: 10 });
      player.arc.x = x;
      player.arc.y = y;
    }

    if (player.hasBeenLonely) {
      lonelyCount += 1;
    }
  });

  updateStatusPanel();

  const allPlayersLonely = lonelyCount === players.length;
  if (allPlayersLonely) {
    setStatusMessage("All players are lonely! Refresh to restart.");
    app.ticker.stop();
  } else {
    setStatusMessage(`${lonelyCount} / ${players.length} have been lonely.`);
  }
});
