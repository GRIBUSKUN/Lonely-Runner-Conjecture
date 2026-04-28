import { Application, Graphics, Text } from "pixi.js";
(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ resizeTo: window });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);
  const speedMultiplier = 0.01;
  const numberOfPlayers = 5;
  const centered = {
    x: () => app.screen.width / 2,
    y: () => app.screen.height / 2,
  };

  const rColor = () => Math.floor(Math.random() * 0xffffff);
  const rad = 200;
  const cycles: number[] = [];
  // const randomSpeed = () => Math.random() * speedMultiplier;
  const uniqueSpeeds: number[] = [];
  while (uniqueSpeeds.length < numberOfPlayers) {
    const speed = Math.random() * speedMultiplier;
    if (!uniqueSpeeds.includes(speed)) {
      uniqueSpeeds.push(speed);
    }
  }

  type player = {
    speed: number;
    angle: number;
    hasBeenLonely: boolean;
    color: number;
    sprite: Graphics;
  };
  const players: player[] = [];
  for (let i = 0; i < numberOfPlayers; i++) {
    players.push(
      (() => {
        const c = rColor();
        return {
          speed: uniqueSpeeds[i],
          angle: 0,
          hasBeenLonely: false,
          color: c,
          sprite: new Graphics().circle(0, 0, 10).fill(c),
        };
      })(),
    );
    cycles.push(0);
  }
  const adds = [];

  // Draw the track ring around the center point.
  adds.push(
    new Graphics()
      .arc(centered.x(), centered.y(), rad, Math.PI, Math.PI * 4, false)
      .stroke({ color: 0xffffff, width: 25 }),
  );

  players.forEach((p) => adds.push(p.sprite));

  // Status text for lonely-player detection.
  const text = new Text({
    text: "Styled Text",
    style: {
      fontSize: 24,
      fill: 0xff1010, // Red color
      fontFamily: "Arial",
      align: "center", // Center alignment
      stroke: { color: "#4a1850", width: 5 }, // Purple stroke
      dropShadow: {
        color: "#000000", // Black shadow
        blur: 4, // Shadow blur
        distance: 6, // Shadow distance
      },
    },
  });
  adds.push(text);

  adds.forEach((p) => {
    app.stage.addChild(p);
  });

  const arcs: Graphics[] = [];
  players.forEach((p) => {
    const arc = new Graphics()
      .arc(0, 0, 220, 0, 0)
      .stroke({ color: p.color, width: 5 });
    arc.x = app.screen.width / 2;
    arc.y = app.screen.height / 2;
    app.stage.addChild(arc);
    arcs.push(arc);
  });

  // function angularDistance(a: number, b: number): number {
  //   const diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
  //   return Math.round(Math.abs(diff * (180 / Math.PI)));
  // }

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
    others: player[],
    exclude?: player,
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

  app.ticker.add(() => {
    const x = centered.x();
    const y = centered.y();
    const minDistance = 360 / players.length;

    // Update each player's position on the circular track.
    players.forEach((p) => {
      p.angle += p.speed;
      p.angle %= 2 * Math.PI;
      p.sprite.x = x + Math.cos(p.angle) * rad;
      p.sprite.y = y + Math.sin(p.angle) * rad;

      // Once a player is lonely, keep that state forever.
      if (!p.hasBeenLonely) {
        const isLonely = players
          .filter((other) => other !== p)
          .every(
            (other) => angularDistance(other.angle, p.angle) >= minDistance,
          );
        arcs[players.indexOf(p)]
          .clear()
          .arc(0, 0, 220 + players.indexOf(p) * 10, 0, 0)
          .stroke({ color: p.color, width: 5 });
        const nearestAngle = findTheNearestRunnerAngle(p.angle, players, p);
        const arcLength =
          (nearestAngle - p.angle + 2 * Math.PI) % (2 * Math.PI);
        const [startAngle, endAngle] =
          arcLength > Math.PI
            ? [nearestAngle, p.angle]
            : [p.angle, nearestAngle];

        arcs[players.indexOf(p)]
          .clear()
          .arc(0, 0, 220 + players.indexOf(p) * 5, startAngle, endAngle)
          .stroke({ color: p.hasBeenLonely ? 0x000000 : p.color, width: 5 });
        if (isLonely) {
          p.hasBeenLonely = true;
        }
      }

      // Draw the player in black if it has ever become lonely.
      const fillColor = p.hasBeenLonely ? 0x000000 : p.color;
      p.sprite.clear().circle(0, 0, 10).fill(fillColor);
    });

    // Position the text at the bottom of the screen.

    // Keep the message as "All players are lonely!" as long as every player has been lonely.
    const allPlayersLonely = players.every((p) => p.hasBeenLonely);
    text.text = allPlayersLonely
      ? "All players are lonely!"
      : players.flatMap((p) => p.speed / speedMultiplier + "°/s").join(",\n");
    text.x = 0;
    text.y = y - text.height / 2;
    if (allPlayersLonely) {
      app.ticker.stop();
    }
  });
})();
