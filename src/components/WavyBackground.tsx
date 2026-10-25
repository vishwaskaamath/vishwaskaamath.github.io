"use client";
import { useEffect, useRef } from 'react';

const vertexSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }
`;
const fragmentSource = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uNoise;
// The tile is generated from 2D Perlin noise once on the CPU. Two filtered
// samples replace many per-pixel gradient evaluations on every animation frame.
float noise(vec2 p) {
  return texture2D(uNoise, p / 16.0).r * 2.0 - 1.0;
}
void main() {
  vec2 p = vUv * uResolution;
  vec2 drift = vec2(uTime * 0.017, -uTime * 0.011);
  float field = noise(p * 0.003 + drift) + 0.48 * noise(p * 0.0065 - drift * 0.7);
  float phase = p.y * 0.34 + field * 6.0
    + sin(p.x * 0.008 + field * 2.4 + uTime * 0.15) * 1.8
    + sin(p.x * 0.017 - p.y * 0.002 + uTime * 0.09) * 0.65;
  float ridge = pow(0.5 + 0.5 * sin(phase), 4.5);
  float shoulder = pow(0.5 + 0.5 * sin(phase - 0.48), 2.0) * 0.2;
  float breathing = 0.78 + 0.12 * sin(field * 3.0 + uTime * 0.08);
  float edge = 1.0 - 0.18 * smoothstep(0.25, 0.75, length(vUv - 0.5));
  float relief = clamp((ridge + shoulder) * breathing * edge, 0.0, 1.0);
  float shade = mix(7.0 / 255.0, 24.0 / 255.0, relief);
  gl_FragColor = vec4(vec3(shade), 1.0);
}
`;

function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram(), buffer = gl.createBuffer(), texture = gl.createTexture();
  const dispose = () => { gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); };
  if (!vertex || !fragment || !program || !buffer || !texture) { dispose(); return null; }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dispose(); return null; }
  gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const time = gl.getUniformLocation(program, 'uTime'), resolution = gl.getUniformLocation(program, 'uResolution');
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 256, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, noiseTile());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.uniform1i(gl.getUniformLocation(program, 'uNoise'), 0);
  return {
    draw: (w: number, h: number, elapsed: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, w, h); gl.uniform1f(time, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }, dispose,
  };
}

// A low-cost CPU gradient noise field keeps unsupported GPUs animated as well.
function perlin(x: number, y: number, period = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (gx: number, gy: number, dx: number, dy: number) => {
    if (period) { gx = ((gx % period) + period) % period; gy = ((gy % period) + period) % period; }
    const hash = Math.imul(gx, 374761393) ^ Math.imul(gy, 668265263);
    const angle = ((hash ^ (hash >>> 13)) >>> 0) / 4294967296 * Math.PI * 2;
    return Math.cos(angle) * dx + Math.sin(angle) * dy;
  };
  const u = fade(fx), v = fade(fy);
  const a = dot(ix,iy,fx,fy), b = dot(ix+1,iy,fx-1,fy), c = dot(ix,iy+1,fx,fy-1), d = dot(ix+1,iy+1,fx-1,fy-1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}

let cachedNoise: Uint8Array;
function noiseTile() {
  if (cachedNoise) return cachedNoise;
  cachedNoise = new Uint8Array(256 * 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    cachedNoise[y * 256 + x] = Math.round((perlin((x + 0.5) / 16, (y + 0.5) / 16, 16) * 0.5 + 0.5) * 255);
  }
  return cachedNoise;
}

export default function WavyBackground({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<HTMLDivElement>(null), gpu = useRef<HTMLCanvasElement>(null), fallback = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = gpu.current!, backup = fallback.current!, element = root.current!;
    const ctx = backup.getContext('2d', { alpha: false });
    let renderer = createRenderer(canvas), raf = 0, elapsed = 0, previous = 0, lastPaint = 0;
    let width = innerWidth, height = innerHeight;
    const still = reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setMode = () => {
      element.dataset.renderer = renderer ? 'webgl' : 'canvas2d';
      canvas.style.display = renderer ? 'block' : 'none'; backup.style.display = renderer ? 'none' : 'block';
    };
    const draw = () => {
      if (renderer) renderer.draw(width, height, elapsed);
      else if (ctx) {
        ctx.fillStyle = '#070707'; ctx.fillRect(0, 0, width, height);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (let row = -50; row < height + 50; row += 18) {
          ctx.beginPath();
          for (let x = -10; x <= width + 10; x += 10) {
            const field = perlin(x * 0.003 + elapsed * 0.017, row * 0.003 - elapsed * 0.011);
            const y = row + field * 21 + Math.sin(x * 0.008 + field * 2.4 + elapsed * 0.15) * 8 + Math.sin(x * 0.017 + elapsed * 0.09) * 3;
            if (x === -10) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.lineWidth = 5; ctx.strokeStyle = '#0e0e0e'; ctx.stroke();
          ctx.lineWidth = 2; ctx.strokeStyle = '#161616'; ctx.stroke();
        }
      }
    };
    const resize = () => {
      width = innerWidth; height = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(1600000 / (width * height)));
      for (const c of [canvas, backup]) { c.width = Math.max(1, Math.round(width*dpr)); c.height = Math.max(1, Math.round(height*dpr)); }
      ctx?.setTransform(dpr,0,0,dpr,0,0); draw();
    };
    const animate = (now: number) => {
      if (document.hidden || still) return;
      elapsed += previous ? Math.min(64, now - previous) / 1000 : 0;
      previous = now;
      if (renderer || now - lastPaint >= 1000 / 30) { draw(); lastPaint = now; }
      raf = requestAnimationFrame(animate);
    };
    const visibility = () => { cancelAnimationFrame(raf); previous = 0; if (!document.hidden && !still) raf = requestAnimationFrame(animate); };
    const lost = (event: Event) => { event.preventDefault(); renderer = null; setMode(); draw(); };
    const restored = () => { renderer = createRenderer(canvas); setMode(); resize(); };
    setMode(); resize(); visibility();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      cancelAnimationFrame(raf); renderer?.dispose();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
    };
  }, [reducedMotion]);
  return <div ref={root} className="wavy-background" aria-hidden="true">
    <canvas ref={gpu} className="wavy-canvas" /><canvas ref={fallback} className="wavy-fallback" />
    <div className="wavy-grain" />
  </div>;
}
