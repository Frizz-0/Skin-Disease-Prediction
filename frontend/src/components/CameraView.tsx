import { useEffect, forwardRef, useImperativeHandle, useRef, useState, memo } from 'react';
import { VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE } from '../lib/spectralShaders';
import { RefreshCw, FlipHorizontal } from 'lucide-react';
import { evaluateFrameQuality, type QualityTelemetry } from '../utils/imageQualityGate';

export interface CameraViewHandle {
  captureCanvas: () => HTMLCanvasElement | null;
}

export type SpectralMode = 'RGB' | 'THERMAL' | 'SIASCOPY' | 'WOODS_LAMP';

interface CameraViewProps {
  activeMode: SpectralMode;
  onQualityUpdate?: (telemetry: QualityTelemetry) => void;
}

const CSS_SPECTRAL_FILTERS: Record<SpectralMode, string> = {
  RGB: 'none',
  THERMAL: 'contrast(1.45) saturate(2.2) hue-rotate(-35deg)',
  SIASCOPY: 'contrast(1.3) saturate(1.7) sepia(0.35) hue-rotate(-15deg)',
  WOODS_LAMP: 'contrast(1.35) saturate(1.8) hue-rotate(195deg) brightness(0.95)',
};

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(({ activeMode, onQualityUpdate }, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);
  const glContextRef = useRef<WebGLRenderingContext | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const forceRedrawRef = useRef<boolean>(true);

  // Uniform locations
  const modeUniformLoc = useRef<WebGLUniformLocation | null>(null);
  const resUniformLoc = useRef<WebGLUniformLocation | null>(null);
  const vidResUniformLoc = useRef<WebGLUniformLocation | null>(null);
  const mirrorUniformLoc = useRef<WebGLUniformLocation | null>(null);

  // Camera & view states
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isSoftwareRenderer, setIsSoftwareRenderer] = useState<boolean>(false);

  // Initialize WebGL pipeline (automatically bypasses SwiftShader CPU emulation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: false,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      setIsSoftwareRenderer(true);
      return;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software/i.test(renderer)) {
      setIsSoftwareRenderer(true);
      return;
    }

    glContextRef.current = gl;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vert = compile(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const frag = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.useProgram(program);
    glProgramRef.current = program;

    modeUniformLoc.current = gl.getUniformLocation(program, 'u_mode');
    resUniformLoc.current = gl.getUniformLocation(program, 'u_resolution');
    vidResUniformLoc.current = gl.getUniformLocation(program, 'u_videoRes');
    mirrorUniformLoc.current = gl.getUniformLocation(program, 'u_mirror');

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    const aTex = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;
  }, []);

  // Update uniforms when modes or mirror toggles change
  useEffect(() => {
    const gl = glContextRef.current;
    if (!gl || isSoftwareRenderer) return;
    const modeMap: Record<SpectralMode, number> = {
      RGB: 0,
      THERMAL: 1,
      SIASCOPY: 2,
      WOODS_LAMP: 3,
    };
    if (modeUniformLoc.current) gl.uniform1i(modeUniformLoc.current, modeMap[activeMode]);
    if (mirrorUniformLoc.current) gl.uniform1i(mirrorUniformLoc.current, isMirrored ? 1 : 0);
    forceRedrawRef.current = true;
  }, [activeMode, isMirrored, isSoftwareRenderer]);

  // Manage Camera Hardware Stream
  useEffect(() => {
    let isCancelled = false;
    let stream: MediaStream | null = null;

    async function startCamera() {
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, min: 24 },
          },
          audio: false,
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        stream = mediaStream;
        lastVideoTimeRef.current = -1;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }
      } catch (err) {
        if (isCancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }

        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });

          if (isCancelled) {
            fallbackStream.getTracks().forEach((t) => t.stop());
            return;
          }

          stream = fallbackStream;
          lastVideoTimeRef.current = -1;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
          }
        } catch (fallbackErr) {
          if (!isCancelled) {
            console.warn('Camera initialization error:', fallbackErr);
          }
        }
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  // Pre-Inference CV Quality Gate Sampler (750ms cadence)
  useEffect(() => {
    if (!onQualityUpdate) return;

    const intervalId = window.setInterval(() => {
      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
        onQualityUpdate(evaluateFrameQuality(video));
      }
    }, 750);

    return () => window.clearInterval(intervalId);
  }, [onQualityUpdate]);

  // GPU WebGL Render Loop (skipped automatically if browser is CPU-only)
  useEffect(() => {
    if (isSoftwareRenderer) return;

    const render = () => {
      const gl = glContextRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (gl && video && canvas && video.readyState >= video.HAVE_CURRENT_DATA) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const displayWidth = Math.floor(canvas.clientWidth * dpr);
        const displayHeight = Math.floor(canvas.clientHeight * dpr);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          gl.viewport(0, 0, canvas.width, canvas.height);
          if (resUniformLoc.current) {
            gl.uniform2f(resUniformLoc.current, canvas.width, canvas.height);
          }
          forceRedrawRef.current = true;
        }

        const hasNewVideoFrame = video.currentTime !== lastVideoTimeRef.current;

        if (hasNewVideoFrame || forceRedrawRef.current) {
          if (vidResUniformLoc.current && video.videoWidth && video.videoHeight) {
            gl.uniform2f(vidResUniformLoc.current, video.videoWidth, video.videoHeight);
          }

          if (hasNewVideoFrame) {
            lastVideoTimeRef.current = video.currentTime;
            gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          }

          gl.drawArrays(gl.TRIANGLES, 0, 6);
          forceRedrawRef.current = false;
        }
      }
      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isSoftwareRenderer]);

  // Expose clean square 224x224 crop directly from video element
  useImperativeHandle(ref, () => ({
    captureCanvas: () => {
      const video = videoRef.current;
      if (!video) return null;

      const offscreen = document.createElement('canvas');
      offscreen.width = 224;
      offscreen.height = 224;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;

      const size = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;

      ctx.drawImage(video, startX, startY, size, size, 0, 0, 224, 224);
      return offscreen;
    }
  }));

  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setIsMirrored(nextMode === 'user');
  };

  return (
    <div className="relative w-full h-full bg-[#050608] flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        muted
        style={isSoftwareRenderer ? { filter: CSS_SPECTRAL_FILTERS[activeMode] } : undefined}
        className={
          isSoftwareRenderer
            ? `absolute inset-0 w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`
            : 'hidden'
        }
      />

      {/* GPU Scaled Viewport Canvas */}
      {!isSoftwareRenderer && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />}

      {/* Floating Tactical Controls: Camera Flip & Screen Mirror */}
      <div className="absolute top-3 right-3 flex items-center gap-3.5 z-20">
        <button
          onClick={() => setIsMirrored(prev => !prev)}
          title="Mirror Viewport"
          style={{ fontSize: '14px' }}
          className={`p-1.5 rounded-full border text-[10px] flex items-center gap-1 transition-all backdrop-blur-md ${isMirrored
            ? 'border-[#ff9900] bg-[#ffffff]/25 text-[#ffaa22]'
            : 'border-[#332212] bg-black/60 text-gray-400 hover:text-white'
            }`}
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">MIRROR</span>
        </button>

        <button
          onClick={toggleCamera}
          title="Switch Camera (Front/Back)"
          style={{ fontSize: '14px' }}
          className="p-1.5 rounded-full border border-[#332212] bg-black/60 text-gray-400 hover:text-[#ffaa22] hover:border-[#ff9900] transition-all backdrop-blur-md flex items-center gap-1 text-[8px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{facingMode === 'environment' ? 'REAR' : 'FRONT'}</span>
        </button>
      </div>

      {/* Tactical HUD Reticles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-64 h-64 border border-[#ff9900]/30 rounded-full relative flex items-center justify-center">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ff9900]" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ff9900]" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#ff9900]" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#ff9900]" />

          <div className="w-10 h-10 border border-[#ffaa00]/70 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#ff9900] rounded-full animate-ping" />
          </div>

          <div className="absolute w-full h-[1px] bg-[#ff9900]/20" />
          <div className="absolute h-full w-[1px] bg-[#ff9900]/20" />
        </div>

        {/* <div className="absolute bottom-3 left-3 bg-black/80 border border-[#44301c] px-2.5 py-1 rounded text-[9px] text-gray-300 backdrop-blur-md">
          <span className="text-[#ffaa22] font-semibold">
            {activeMode === 'RGB' && 'OPTICAL: NATURAL SPECULAR'}
            {activeMode === 'THERMAL' && 'SPECTRAL: FLIR IRONBOW ΔT'}
            {activeMode === 'SIASCOPY' && 'SPECTRAL: SIASCOPY MELANIN/Hb'}
            {activeMode === 'WOODS_LAMP' && "SPECTRAL: UV 365nm FLUORESCENCE"}
          </span>
        </div> */}
      </div>
    </div>
  );
});

CameraView.displayName = 'CameraView';
export default memo(CameraView);