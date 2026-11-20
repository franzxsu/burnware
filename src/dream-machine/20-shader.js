/* ============================================================
   Dream Machine, part 2: the world, as one fragment shader.
   For every pixel, a ray goes out from your eye and marches
   through a world described only by distance functions: noise
   terrain, a sea of moving waves, and surreal monuments placed
   on an endless grid of cells (each cell rolls its own dice).
   Nothing is stored, so the world never ends.
   ============================================================ */
const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uFov, uBend, uGeo, uPhys, uScale, uSteps, uShadow, uFogK, uStars, uLightPal;
uniform vec3 uCam, uSun; uniform mat3 uRot; uniform vec2 uSeed;
uniform vec3 uTop, uHor, uLow, uFogC, uStone, uStone2, uGlow, uMoon, uSea, uMist;
const float CS = 300.0;
vec3 gRd; float gMat;

/* a hash built only from whole numbers below 2^24, so the graphics card and JavaScript get exactly the same answer */
float perm(float x){ return mod((x * 34. + 1.) * x, 289.); }
float hash12(vec2 p){ p = mod(floor(p), 289.); return perm(perm(p.x) + p.y) / 289.; }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  float a = hash12(i), b = hash12(i + vec2(1., 0.)), c = hash12(i + vec2(0., 1.)), d = hash12(i + vec2(1., 1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float fbm(vec2 p, float oct){ float s = 0., a = .5, n = 0.; for (int i = 0; i < 6; i++) { if (float(i) >= oct) break; s += a * vnoise(p); n += a; p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s / n; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

/* ---- the land: rolling noise, ridges on the high ground; melted = warped, crystal = terraced ---- */
float terrain(vec2 xz, float oct){
  vec2 q = xz * .0021 + uSeed;
  if (uGeo > 2.5 && uGeo < 3.5) q += (vec2(vnoise(q * 2.), vnoise(q * 2. + 7.)) - .5) * .6;
  float n = fbm(q, oct), h = (n - .47) * 260.;
  float r = 1. - abs(vnoise(q * 3.1 + 3.) * 2. - 1.); h += r * r * 60. * smoothstep(.45, .7, n);
  if (uGeo > 3.5) { float k = h / 16.; h = (floor(k) + smoothstep(.55, 1., fract(k))) * 16.; }
  return h;
}
/* ---- the sea: a few long swells and a choppy layer, moving with dream time ---- */
float water(vec2 xz){
  float t = uTime;
  return sin(dot(xz, vec2(.045, .015)) + t * 1.1) * 1.6 + sin(dot(xz, vec2(-.022, .052)) + t * 1.4) * 1.1 + sin(dot(xz, vec2(.09, -.07)) + t * 2.2) * .45 + (vnoise(xz * .04 + t * .12) - .5) * 2. - 2.;
}
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdCyl(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
vec2 U(vec2 a, vec2 b){ return a.x < b.x ? a : b; }   // union that remembers which material was closer

/* ---- the monuments. q is in the monument's own space: ground at y = 0. Materials: 3 stone, 4 dark stone, 5 light ---- */
vec2 shape(float type, vec3 q, float ch){
  vec2 r = vec2(1e5, 3.);
  if (type < .5) {   // the great ring, standing on its edge, with a slab behind it
    vec3 o = q - vec3(0., 47., 0.);
    r = vec2(length(vec2(length(o.xy) - 40., o.z)) - 7., 3.);
    r = U(r, vec2(sdBox(q - vec3(0., 3., 0.), vec3(34., 3., 12.)), 4.));
    r = U(r, vec2(sdBox(q - vec3(-26., 52., -17.), vec3(6.5, 52., 6.5)), 4.));
    r = U(r, vec2(sdBox(q - vec3(18., 6., 9.), vec3(2.2, 6., .4)), 5.));
    if (uGeo > .5 && uGeo < 1.5) r = U(r, vec2(length(vec2(length(o.zy) - 40., o.x)) - 7., 3.));
    if (uGeo > 1.5 && uGeo < 2.5) { r = U(r, vec2(length(vec2(length(o.zy) - 24., o.x)) - 4.5, 3.)); r = U(r, vec2(length(vec2(length(o.xy) - 13., o.z)) - 2.6, 4.)); }
  } else if (type < 1.5) {   // a spire like a termite tower left out in the rain
    float y = clamp(q.y / 150., 0., 1.), rad = 15. * pow(1. - y, .7) * (1. + .18 * sin(q.y * .12 + ch * 20.));
    r = vec2(max(max((length(q.xz) - rad) * .7, -q.y), q.y - 150.), 4.);
    r = U(r, vec2(sdBox(q - vec3(rad * .9, 70., 0.), vec3(.6, 4., 2.2)), 5.));
    if (uGeo > 1.5 && uGeo < 2.5) { vec3 e = (q - vec3(26., 0., 10.)) * 2.; float ey = clamp(e.y / 150., 0., 1.); r = U(r, vec2(max(max((length(e.xz) - 15. * pow(1. - ey, .7)) * .7, -e.y), e.y - 150.) * .5, 4.)); }
  } else if (type < 2.5) {   // a floating island with a little tower and a lit window
    vec3 o = q - vec3(0., 130. + ch * 90., 0.);
    float d = (length(o / vec3(40., 70., 40.)) - 1.) * 36.;
    d = max(d, o.y) + (vnoise(o.xz * .08) - .5) * 5.;
    r = vec2(d, 3.);
    r = U(r, vec2(sdCyl(o - vec3(10., 16., 0.), 5., 16.), 4.));
    r = U(r, vec2(sdBox(o - vec3(15.2, 22., 0.), vec3(.4, 3., 1.6)), 5.));
  } else if (type < 3.5) {   // a monolith with a lit doorway cut into it
    r = vec2(sdBox(q - vec3(0., 55., 0.), vec3(6., 55., 20.)), 4.);
    r = U(r, vec2(sdBox(q - vec3(6.2, 12., 0.), vec3(.4, 12., 4.)), 5.));
  } else if (type < 4.5) {   // a gate to nowhere, with a light hanging in it
    r = vec2(min(sdBox(q - vec3(26., 40., 0.), vec3(6., 40., 6.)), sdBox(q - vec3(-26., 40., 0.), vec3(6., 40., 6.))), 3.);
    r = U(r, vec2(sdBox(q - vec3(0., 84., 0.), vec3(36., 5., 8.)), 4.));
    r = U(r, vec2(length(q - vec3(0., 58. + sin(uTime + ch * 9.) * 3., 0.)) - 4., 5.));
  } else if (type < 5.5) {   // a lighthouse
    r = vec2(sdCyl(q - vec3(0., 45., 0.), 11., 45.), 3.);
    r = U(r, vec2(max((length(q.xz) - 13. * (1. - (q.y - 100.) / 26.)) * .7, max(100. - q.y, q.y - 126.)), 4.));
    r = U(r, vec2(sdCyl(q - vec3(0., 95., 0.), 9.5, 5.), 5.));
  } else {   // stairs that climb to a door and stop
    float k = clamp(floor(q.x / 7. + .5), 0., 24.);
    float k2 = clamp(k + 1., 0., 24.);   // each step is a solid column from the ground up; check this step and the next
    r = vec2(min(sdBox(q - vec3(k * 7., (k * 5. + 5.) * .5, 0.), vec3(3.6, (k * 5. + 5.) * .5, 10.)), sdBox(q - vec3(k2 * 7., (k2 * 5. + 5.) * .5, 0.), vec3(3.6, (k2 * 5. + 5.) * .5, 10.))), 4.);
    r = U(r, vec2(sdBox(q - vec3(172., 135., 0.), vec3(.4, 10., 5.)), 5.));
    r = U(r, vec2(sdBox(q - vec3(172., 147., 0.), vec3(1.5, 2., 7.)), 4.));
  }
  return r;
}
/* each cell of the grid rolls its dice: is there a monument, which one, where, how big, which way it faces */
vec2 monuments(vec3 p){
  vec2 id = floor(p.xz / CS), res = vec2(1e5, 3.);
  float ch = hash12(id + uSeed * 7.); if (ch < .3) return res;
  float type = floor(hash12(id + vec2(5., 1.)) * 7.);
  vec2 c = (id + .5) * CS + (vec2(hash12(id + 3.), hash12(id + 7.)) - .5) * CS * .3;
  float sc = uScale > 2.5 ? .4 + hash12(id + 2.) * 2.2 : uScale > 1.5 ? 1. : uScale > .5 ? 2.2 : 1.;
  if (type > 5.5) sc = min(sc, 1.);   // the stairs are long: keep them inside their cell
  float base = max(terrain(c, 3.), -3.), ang = hash12(id + 11.) * 6.283, t = uTime, ph = ch * 6.283;
  vec3 q = p - vec3(c.x, base, c.y);
  if (uPhys > 1.5 && uPhys < 2.5) ang += t * .25;                                   // orbiting: they turn
  q.xz = rot(ang) * q.xz;
  float floaty = type > 1.5 && type < 2.5 ? 1. : 0.;
  if (uPhys < .5) q.y -= sin(t * .5 + ph) * (floaty * 7. + 1.2) * sc;                 // floating: they bob
  if (uPhys > 2.5 && uPhys < 3.5 && (floaty > .5 || type > 2.5 && type < 3.5)) q.y -= mod(-t * 28. + ph * 120., 760.) - 260.;   // falling, forever
  if (uPhys > 3.5) sc *= 1. + .08 * sin(t * .9 + ph);                                // breathing
  if (uGeo > 2.5 && uGeo < 3.5) { q.x += sin(q.y * .035 + t * .3) * q.y * .1; q.z += cos(q.y * .05) * q.y * .05; }   // melted
  res = shape(type, q / sc, ch); res.x *= sc * .75;
  if (uGeo > .5 && uGeo < 1.5) { vec2 tw = shape(type, vec3(q.x, 430. * sc - q.y, -q.z) / sc, ch); tw.x *= sc * .75; res = U(res, tw); }   // impossible: an upside-down twin above
  return res;
}
/* the whole world: land, sea, monuments. Bend lifts (or drops) everything with distance from you. */
vec2 map(vec3 p){
  float dd = dot(p.xz - uCam.xz, p.xz - uCam.xz); p.y -= uBend * dd;
  vec2 r = vec2((p.y - terrain(p.xz, 5.)) * .45, 1.);
  r = U(r, vec2((p.y - water(p.xz)) * .6, 2.));
  return U(r, monuments(p));
}
/* how far along the ray until it leaves this cell: never step over a neighbour's monument */
float cellExit(vec2 p, vec2 d){
  vec2 id = floor(p / CS), lo = id * CS, hi = lo + CS;
  vec2 t = vec2(d.x > 0. ? (hi.x - p.x) / d.x : d.x < 0. ? (lo.x - p.x) / d.x : 1e5, d.y > 0. ? (hi.y - p.y) / d.y : d.y < 0. ? (lo.y - p.y) / d.y : 1e5);
  return min(t.x, t.y);
}
vec3 sky(vec3 rd){
  float y = rd.y;
  vec3 c = y > 0. ? mix(uHor, uTop, pow(clamp(y, 0., 1.), .5)) : mix(uHor, uLow, pow(clamp(-y * 2.5, 0., 1.), .6));
  float md = dot(rd, uSun);
  c += uMoon * (pow(max(md, 0.), 420.) * .6 + pow(max(md, 0.), 18.) * .12);
  if (md > .9988) { float cr = vnoise(rd.xy * 160.) * .5 + vnoise(rd.yz * 60.) * .5; c = mix(c, uMoon * (.75 + .35 * cr), smoothstep(.9988, .99915, md)); }
  if (uStars > 0. && y > 0.) { vec3 g = floor(rd * 220.); float h = hash12(g.xy * 3. + g.z * 17.); c += vec3(smoothstep(.9965, 1., h)) * uStars * smoothstep(0., .25, y) * (.6 + .4 * sin(uTime * 2. + h * 90.)); }
  if (y > .01) {   // clouds, drifting on a ceiling far above
    vec2 cp = uCam.xz + rd.xz * (900. - uCam.y) / y;
    float cl = smoothstep(.5, .78, fbm(cp * .0011 + vec2(uTime * .006, 0.), 4.)) * smoothstep(.01, .2, y);
    c = mix(c, mix(uHor, uMoon, .35) * (.7 + .3 * y), cl * .6);
  }
  return c;
}
float shadow(vec3 ro, vec3 rd){
  float s = 1., t = 2.;
  for (int i = 0; i < 28; i++) { if (float(i) >= uShadow) break; float h = map(ro + rd * t).x; s = min(s, 10. * h / t); t += clamp(h, 2., 40.); if (s < .02 || t > 600.) break; }
  return clamp(s, 0., 1.);
}
void main(){
  vec2 uv = (gl_FragCoord.xy * 2. - uRes) / uRes.y;
  vec3 rd = normalize(uRot * vec3(uv * uFov, -1.)), ro = uCam; gRd = rd;
  float t = .5, far = 2600.; vec2 hit = vec2(-1.);
  for (int i = 0; i < 220; i++) {
    if (float(i) >= uSteps) break;
    vec3 p = ro + rd * t; vec2 r = map(p);
    if (r.x < .0015 * t + .02) { hit = vec2(t, r.y); break; }
    t += min(r.x, cellExit(p.xz, rd.xz) + .5);
    if (t > far) break;
  }
  vec3 col;
  if (hit.x < 0.) col = sky(rd);
  else {
    vec3 p = ro + rd * hit.x, n; float m = hit.y, e = max(.02, .0016 * hit.x);
    if (m < 1.5) { vec2 xz = p.xz; float h0 = terrain(xz, 5.); n = normalize(vec3(h0 - terrain(xz + vec2(e, 0.), 5.), e, h0 - terrain(xz + vec2(0., e), 5.))); }
    else if (m < 2.5) { vec2 xz = p.xz; float w0 = water(xz) + vnoise(xz * .5 + uTime * .5) * .25; n = normalize(vec3(w0 - water(xz + vec2(e, 0.)) - vnoise((xz + vec2(e, 0.)) * .5 + uTime * .5) * .25, e, w0 - water(xz + vec2(0., e)) - vnoise((xz + vec2(0., e)) * .5 + uTime * .5) * .25)); }
    else { vec2 k = vec2(1., -1.) * e; n = normalize(k.xyy * map(p + k.xyy).x + k.yyx * map(p + k.yyx).x + k.yxy * map(p + k.yxy).x + k.xxx * map(p + k.xxx).x); }
    if (uGeo > 3.5) n = normalize(floor(n * 2.6 + .5));   // crystal: every surface snaps to a facet
    float dif = max(dot(n, uSun), 0.), sh = dif > 0. && uShadow > 0. ? shadow(p + n * 1.5, uSun) : 1.;
    vec3 amb = mix(uLow, uTop, n.y * .5 + .5) * .55 + uHor * .25;
    if (m < 1.5) {
      float hh = p.y - uBend * dot(p.xz - uCam.xz, p.xz - uCam.xz), v = .8 + .4 * vnoise(p.xz * .05);
      vec3 base = mix(uStone2, uStone, smoothstep(-10., 90., hh)) * v;
      base = mix(base * .7, base, smoothstep(.55, .85, n.y));
      base = mix(mix(base, uMist, .35), base, smoothstep(0., 6., hh));
      col = base * (amb + uMoon * dif * sh * 1.1);
    } else if (m < 2.5) {
      float fr = .04 + .96 * pow(1. - max(dot(-rd, n), 0.), 5.); vec3 rf = reflect(rd, n);
      col = mix(uSea * (.35 + .65 * dif), sky(rf), fr) + uMoon * pow(max(dot(rf, uSun), 0.), 140.) * 1.6 * sh;
    } else if (m < 4.5) {
      vec3 base = (m < 3.5 ? uStone : uStone2) * (.86 + .14 * sin(p.y * .9)) * (.85 + .3 * vnoise(p.xz * .3 + p.y * .2));
      col = base * (amb + uMoon * dif * sh * 1.1);
    } else col = uGlow * 1.6;
    float fog = 1. - exp(-hit.x * uFogK);
    vec3 fc = mix(uFogC, uHor, .5) + uMoon * pow(max(dot(rd, uSun), 0.), 8.) * .25;
    col = mix(col, fc, fog);
  }
  vec2 sv = gl_FragCoord.xy / uRes; col *= .82 + .18 * pow(16. * sv.x * sv.y * (1. - sv.x) * (1. - sv.y), .25);   // a soft vignette
  col += (hash12(gl_FragCoord.xy + floor(fract(uTime * 7.) * 97.)) - .5) * .03;                                                  // and a little grain
  gl_FragColor = vec4(col, 1.);
}`;
