"use client";

import { useEffect, useRef } from "react";

const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;
  uniform sampler2D uImage;
  uniform vec2 uCover;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = (vUv - 0.5) * uCover / 1.025 + 0.5;
    // Broad, overlapping swells: a few pixels of movement over 20–30 seconds.
    // A fixed camera and tiny displacement keep the original photograph intact.
    float swell = sin(uv.x * 13.0 + uv.y * 8.0 - uTime * 0.24);
    float undertow = sin(uv.x * 7.0 - uv.y * 11.0 + uTime * 0.18);
    uv.x += swell * 0.0020 + undertow * 0.0008;
    uv.y += swell * 0.0030 - undertow * 0.0012;
    gl_FragColor = texture2D(uImage, uv);
  }
`;

export default function OceanBackground({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // The CSS photograph also covers unsupported WebGL devices.

    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const dispose = () => {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach((shader) => gl.deleteShader(shader));
      delete canvas.dataset.ready;
    };
    if (!vertex || !fragment || !program || !buffer || !texture) {
      dispose();
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      dispose();
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const cover = gl.getUniformLocation(program, "uCover");
    const time = gl.getUniformLocation(program, "uTime");
    gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const photo = new Image();
    let frame = 0;
    let elapsed = 0;
    let previous = 0;
    let loaded = false;
    let disposed = false;

    const draw = () => {
      gl.uniform1f(time, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const resize = () => {
      if (!loaded) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      // Cap fill rate while the foreground video and particle canvas are running.
      const ratio = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(2400000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const aspect = width / height;
      const imageAspect = photo.naturalWidth / photo.naturalHeight;
      gl.uniform2f(cover, Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect));
      draw();
    };
    const animate = (now: number) => {
      if (disposed || document.hidden || !loaded) return;
      if (!previous) previous = now;
      if (now - previous >= 1000 / 30) {
        elapsed += Math.min(now - previous, 100) / 1000;
        previous = now;
        draw();
      }
      frame = requestAnimationFrame(animate);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden && loaded) frame = requestAnimationFrame(animate);
    };
    const contextLost = () => {
      // Reveal the still photo immediately if the GPU context becomes unavailable.
      loaded = false;
      cancelAnimationFrame(frame);
      delete canvas.dataset.ready;
    };
    photo.onload = () => {
      if (disposed || gl.isContextLost()) return;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, photo);
      loaded = true;
      resize();
      canvas.dataset.ready = "true";
      visibility();
    };
    photo.src = "/media/ocean-background.jpg";
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      photo.onload = null;
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      dispose();
    };
  }, [reducedMotion]);

  return (
    <div className="ocean-background" aria-hidden="true">
      <canvas ref={canvasRef} className="ocean-canvas" />
    </div>
  );
}
