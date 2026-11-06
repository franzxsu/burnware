/* ============================================================
   AI driver: follows the racing line with a speed profile
   ============================================================ */
class AIDriver {
  constructor(car, opts = {}) {
    this.car = car; this.w = car.world;
    this.skill = opts.skill || 0.97;       // fraction of the theoretical corner speed
    this.bias = opts.bias || 0;            // personal lateral preference, metres
    this.rubber = 1;
    this.stuckT = 0; this.revT = 0; this.avoid = 0; this.wantReset = false;
    this.inp = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  }
  update(dt, others) {
    const c = this.car, W = this.w, N = W.N, inp = this.inp;
    const v = c.speed, i = c.idx;
    // reversing out of trouble
    if (this.revT > 0) {
      this.revT -= dt;
      inp.throttle = 0; inp.brake = 1; inp.handbrake = false; inp.steer = -this.revSteer;
      return inp;
    }
    // avoid cars directly ahead
    let avoid = 0;
    for (const o of others) {
      if (o === c) continue;
      const rx = o.pos.x - c.pos.x, rz = o.pos.z - c.pos.z;
      const along = rx * c.az.x + rz * c.az.z, side = rx * c.ax.x + rz * c.ax.z;
      if (along > 1 && along < 13 && Math.abs(side) < 2.4 && o.speed < v + 1) avoid = side > 0 ? 2.3 : -2.3;
    }
    this.avoid = damp(this.avoid, avoid, 3, dt);
    // target point on the racing line
    const look = 5.5 + Math.max(0, c.vF) * 0.42;
    const j = (i + Math.round(look / W.ds)) % N;
    const lim = Math.max(0.2, W.W[j] - 1.6);
    let off = clamp(W.LOFF[j] + this.bias + this.avoid, -lim, lim);
    if (c.offRoad > 2.5) off *= 0.3;
    const tx = W.X[j] + W.RX[j] * off, tz = W.Z[j] + W.RZ[j] * off;
    const dx = tx - c.pos.x, dz = tz - c.pos.z;
    const lx = dx * c.ax.x + dz * c.ax.z, lz = dx * c.az.x + dz * c.az.z;
    const ang = Math.atan2(lx, lz);
    inp.steer = clamp(-ang * 2.3 + c.angVel.y * 0.1, -1, 1);
    // speed control
    const lead = (i + Math.round((2 + v * 0.35) / W.ds)) % N;
    // off the line or pointing the wrong way: slow down until it is back
    const lineErr = Math.abs((c.lat || 0) - W.LOFF[i]);
    let vt = W.LV[lead] * this.skill * this.rubber * (c.spec.aiK || 1) * clamp(1.08 - 0.045 * lineErr, 0.55, 1);
    if (this.out) vt = 0;
    if (Math.abs(inp.steer) > 0.95 && v > 14) vt = Math.min(vt, v - 1.5);
    if (c.offRoad > 1) vt = Math.min(vt, 16);
    inp.throttle = 0; inp.brake = 0;
    if (v > vt + 1.0) inp.brake = clamp((v - vt) / 5, 0.25, 1);
    else inp.throttle = clamp((vt - v) / 2.5 + 0.45, 0, 1);
    if (c.spinAmt > 0.25) inp.throttle *= 0.55;
    if (Math.abs(c.slipAngle) > 0.38) inp.throttle *= 0.6;
    if (Math.abs(ang) > 1.6 && v < 6) { inp.throttle = 0.6; }
    inp.handbrake = Math.abs(ang) > 0.85 && v > 9 && v < 24 && c.grounded >= 2;
    // stuck?
    if (inp.throttle > 0.4 && v < 1.2) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 1.4) { this.stuckT = 0; this.revT = 1.3; this.revSteer = inp.steer; this.stuckCount = (this.stuckCount || 0) + 1; }
    return inp;
  }
}

/* shared recovery rules for every car (player included) */
function needsReset(car, dt) {
  // no forward progress for a while (pinned on a tree, circling in a field)
  car.progT = (car.progT || 0) + dt;
  if (car.progT > 6) { const moved = (car.prog || 0) - (car.progMark === undefined ? -1e9 : car.progMark); car.progMark = car.prog || 0; car.progT = 0; if (moved < 8 && car.offRoad > 1.5) return true; }
  const upside = car.ay.y < 0.3 && car.speed < 3;
  const lost = car.offRoad > 22 || car.pos.y < car.world.heightAt(car.pos.x, car.pos.z, car.idx) - 3;
  const stuck = car.speed < 0.6 && car.offRoad > 4;
  const beached = car.grounded === 0 && car.airT > 1.4 && car.speed < 7;
  car.resetT = (upside || lost || stuck || beached) ? (car.resetT || 0) + dt : 0;
  return car.resetT > (lost ? 1.0 : upside ? 1.6 : beached ? 1.2 : 4.0);
}
