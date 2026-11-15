export const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
  }
`;

export const FRAGMENT_SHADER_SOURCE = `
  precision highp float;
  uniform sampler2D u_image;
  uniform int u_mode;          // 0: RGB, 1: FLIR Thermal, 2: SIAscopy, 3: Wood's Lamp
  uniform vec2 u_resolution;   // Active canvas pixel resolution
  uniform vec2 u_videoRes;     // Raw camera hardware stream resolution
  uniform int u_mirror;        // 1: Horizontal mirror, 0: Normal
  varying vec2 v_texCoord;

  // Exact aspect-ratio preserving UV coordinates (object-fit: cover)
  vec2 getAspectCoverUV(vec2 uv) {
    if (u_mirror == 1) {
      uv.x = 1.0 - uv.x;
    }
    float canvasAspect = u_resolution.x / max(u_resolution.y, 1.0);
    float videoAspect  = u_videoRes.x / max(u_videoRes.y, 1.0);

    vec2 scale = vec2(1.0);
    if (canvasAspect > videoAspect) {
      scale.y = videoAspect / canvasAspect;
    } else {
      scale.x = canvasAspect / videoAspect;
    }
    return (uv - 0.5) * scale + 0.5;
  }

  // Radiometric FLIR Ironbow Transfer Function (Black -> Indigo -> Purple -> Crimson -> Orange -> Blazing Yellow -> White Hot)
  vec3 flirIronbow(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c0 = vec3(0.02, 0.01, 0.06); // Ambient black
    vec3 c1 = vec3(0.22, 0.02, 0.44); // Deep indigo
    vec3 c2 = vec3(0.58, 0.04, 0.48); // Magenta
    vec3 c3 = vec3(0.85, 0.14, 0.08); // Arterial crimson
    vec3 c4 = vec3(0.98, 0.55, 0.00); // Warm amber
    vec3 c5 = vec3(1.00, 0.88, 0.20); // Blazing yellow
    vec3 c6 = vec3(1.00, 1.00, 1.00); // White core

    if (t < 0.16) return mix(c0, c1, t / 0.16);
    if (t < 0.33) return mix(c1, c2, (t - 0.16) / 0.17);
    if (t < 0.50) return mix(c2, c3, (t - 0.33) / 0.17);
    if (t < 0.70) return mix(c3, c4, (t - 0.50) / 0.20);
    if (t < 0.88) return mix(c4, c5, (t - 0.70) / 0.18);
    return mix(c5, c6, (t - 0.88) / 0.12);
  }

  void main() {
    vec2 uv = getAspectCoverUV(v_texCoord);

    // Bounds safety check
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.04, 0.04, 0.06, 1.0);
      return;
    }

    vec2 step = 1.0 / u_resolution;
    vec4 baseColor = texture2D(u_image, uv);
    vec3 rgb = baseColor.rgb;

    // Luminance & high-frequency edge extractor (used across all clinical modes)
    float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
    
    // 4-tap neighbor sampling for spatial diffusion & embossing
    vec3 cN = texture2D(u_image, uv + vec2(0.0, step.y * 2.5)).rgb;
    vec3 cS = texture2D(u_image, uv - vec2(0.0, step.y * 2.5)).rgb;
    vec3 cE = texture2D(u_image, uv + vec2(step.x * 2.5, 0.0)).rgb;
    vec3 cW = texture2D(u_image, uv - vec2(step.x * 2.5, 0.0)).rgb;
    vec3 blurred = (rgb + cN + cS + cE + cW) * 0.2;

    // High-pass micro-texture edge emboss
    float highPass = clamp((lum - dot(blurred, vec3(0.299, 0.587, 0.114))) * 2.5 + 0.5, 0.0, 1.0);

    // ==========================================
    // 0: NATURAL SPECULAR (DERMOSCOPIC CLARITY)
    // ==========================================
    if (u_mode == 0) {
      // Sharpened unsharp mask with subtle color saturation preservation
      vec3 sharp = clamp(rgb * 1.35 - blurred * 0.35, 0.0, 1.0);
      gl_FragColor = vec4(sharp, 1.0);
      return;
    }

    // ========================================================
    // 1: CLINICAL FLIR MSX (MULTI-SPECTRAL DYNAMIC IMAGING)
    // ========================================================
    if (u_mode == 1) {
      // Step A: Calculate physiological erythema / capillary perfusion from diffused field
      float bR = blurred.r;
      float bG = blurred.g;
      float bB = blurred.b;
      
      // Calibrated hemoglobin absorption ratio
      float rawErythema = (bR - bG * 0.85) / max(bR + bG + 0.1, 0.2);
      
      // Auto-gain contrast stretch (maps normal cutaneous tissue to 0.15 - 0.85 thermal gradient)
      float thermalNorm = clamp((rawErythema - 0.02) * 2.4, 0.0, 1.0);
      
      // Thermal diffusion curve (heat diffuses naturally)
      thermalNorm = smoothstep(0.05, 0.95, thermalNorm);
      
      // Step B: Sample true Radiometric FLIR Palette
      vec3 heatMap = flirIronbow(thermalNorm);

      // Step C: FLIR MSX Emboss Injection (Overlays visible structural borders onto heat map)
      float edgeIntensity = (highPass - 0.5) * 0.65;
      vec3 msxResult = clamp(heatMap + vec3(edgeIntensity), 0.0, 1.0);

      gl_FragColor = vec4(msxResult, 1.0);
      return;
    }

    // ========================================================
    // 2: CLINICAL SIASCOPY (ASTRON CLINICA SIAGRAPH SPLIT)
    // ========================================================
    if (u_mode == 2) {
      float split = 0.0;
      float dist = abs(v_texCoord.x - split);

      // Center tactile amber reticle divider
      if (dist < 0.0015) {
        gl_FragColor = vec4(1.0, 0.62, 0.0, 1.0);
        return;
      }

      // --- LEFT HALF: TOTAL MELANIN SIAGRAPH ---
      if (v_texCoord.x < split) {
        // Melanin optical density calculated across green and red spectra
        float melaninSignal = (1.0 - rgb.r) * 0.65 + (1.0 - rgb.g) * 0.35;
        // Contrast enhancement without clipping shadows
        float mNorm = clamp((melaninSignal - 0.15) * 1.8, 0.0, 1.0);
        mNorm = pow(mNorm, 1.2);

        // Realistic dermoscopic pigment palette: Light ivory skin to dark umber/black melanin
        vec3 paleSkin = vec3(0.93, 0.84, 0.74);
        vec3 midPigment = vec3(0.68, 0.42, 0.18);
        vec3 deepMelanin = vec3(0.12, 0.05, 0.02);

        vec3 melaninMap = mNorm < 0.5 
          ? mix(paleSkin, midPigment, mNorm / 0.5)
          : mix(midPigment, deepMelanin, (mNorm - 0.5) / 0.5);

        // Preserve epidermal pore texture
        melaninMap *= (0.85 + 0.3 * highPass);
        gl_FragColor = vec4(clamp(melaninMap, 0.0, 1.0), 1.0);
        return;
      }

      // --- RIGHT HALF: BLOOD & VASCULAR SIAGRAPH ---
      else {
        // Hemoglobin concentration index: isolates vascular pooling from background pigment
        float hemoSignal = (rgb.r - rgb.g * 0.75 - rgb.b * 0.25);
        float hNorm = clamp((hemoSignal - 0.05) * 3.2, 0.0, 1.0);
        hNorm = smoothstep(0.1, 0.85, hNorm);

        // Clinical vascular palette: Pale dermal background to intense ruby/arterial crimson
        vec3 dermalBed = vec3(0.90, 0.82, 0.82);
        vec3 hyperErythema = vec3(0.85, 0.04, 0.12);

        vec3 vascularMap = mix(dermalBed, hyperErythema, hNorm);
        // Retain fine micro-capillary borders
        vascularMap *= (0.88 + 0.25 * highPass);

        gl_FragColor = vec4(clamp(vascularMap, 0.0, 1.0), 1.0);
        return;
      }
    }

    // ========================================================
    // 3: AUTHENTIC CLINICAL WOOD'S LAMP (365nm UV EXCITATION)
    // ========================================================
    if (u_mode == 3) {
      // Step A: Suppress white-light diffuse reflections (darkroom effect)
      // Normal skin absorbs UV and reflects low-level dark slate-violet
      vec3 darkroomBase = vec3(0.10, 0.06, 0.18) * (lum * 0.6 + 0.2);

      // Step B: Epidermal Melanin UV Absorption
      // Melanocytic lesions absorb 365nm light, appearing deep, stark, inky velvet
      float melaninAbsorb = clamp((1.0 - lum) * 1.5, 0.0, 1.0);
      float melaninLoss = pow(melaninAbsorb, 1.8) * 0.85;

      // Step C: True Autofluorescence Phenomena
      // 1. Porphyrins (C. acnes in micro-follicles/pores): Emits bright coral-orange / brick-red
      float redSpike = max(0.0, rgb.r - max(rgb.g, rgb.b));
      vec3 porphyrinGlow = vec3(1.0, 0.32, 0.15) * pow(redSpike * 3.5, 2.2);

      // 2. Dermal collagen / unpigmented skin autofluorescence: Chalky electric cyan
      float cyanExcitation = clamp((rgb.g * 0.7 + rgb.b * 1.2) - rgb.r * 0.8, 0.0, 1.0);
      vec3 collagenGlow = vec3(0.15, 0.65, 0.85) * pow(cyanExcitation, 2.0) * 0.75;

      // Composite authentic UV fluorescence
      vec3 woodsResult = darkroomBase * (1.0 - melaninLoss);
      woodsResult += collagenGlow;
      woodsResult += porphyrinGlow;

      // Add high-frequency border definition so lesion borders are razor sharp under UV
      woodsResult += vec3((highPass - 0.5) * 0.15);

      gl_FragColor = vec4(clamp(woodsResult, 0.0, 1.0), 1.0);
      return;
    }
  }
`;