const clamp01 = (value) => Math.min(Math.max(Number(value) || 0, 0), 1);

const DEFAULT_TEXT_OVERLAY_STYLE = {
  fontFamily: 'Inter',
  fontWeight: 600,
  fontSize: 48,
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  textAlign: 'center',
  letterSpacing: 0,
  lineHeight: 1.1,
  uppercase: false,
  italic: false,
  shadow: {
    offsetX: 0,
    offsetY: 2,
    blur: 24,
    color: 'rgba(0, 0, 0, 0.55)',
  },
  paddingX: 32,
  paddingY: 18,
  borderRadius: 12,
};

const DEFAULT_TEXT_OVERLAY_KEYFRAMES = [
  { time: 0, opacity: 0, translateY: 24 },
  { time: 0.06, opacity: 1, translateY: 0 },
  { time: 0.94, opacity: 1, translateY: 0 },
  { time: 1, opacity: 0, translateY: -12 },
];

export const DEFAULT_TEXT_OVERLAY = {
  text: 'New overlay text',
  style: { ...DEFAULT_TEXT_OVERLAY_STYLE },
  position: {
    xPercent: 0.5,
    yPercent: 0.78,
  },
  anchor: 'center',
  keyframes: [...DEFAULT_TEXT_OVERLAY_KEYFRAMES],
};

const normalizeShadow = (value = {}, fallback = DEFAULT_TEXT_OVERLAY_STYLE.shadow) => {
  const base = fallback || DEFAULT_TEXT_OVERLAY_STYLE.shadow;
  return {
    offsetX: Number.isFinite(value.offsetX) ? value.offsetX : base.offsetX,
    offsetY: Number.isFinite(value.offsetY) ? value.offsetY : base.offsetY,
    blur: Number.isFinite(value.blur) ? Math.max(0, value.blur) : base.blur,
    color: typeof value.color === 'string' ? value.color : base.color,
  };
};

const normalizeStyle = (style = {}, fallback = DEFAULT_TEXT_OVERLAY_STYLE) => {
  const base = fallback || DEFAULT_TEXT_OVERLAY_STYLE;
  const normalized = {
    fontFamily: typeof style.fontFamily === 'string' ? style.fontFamily : base.fontFamily,
    fontWeight: style.fontWeight || base.fontWeight,
    fontSize: Number.isFinite(style.fontSize) ? style.fontSize : base.fontSize,
    color: typeof style.color === 'string' ? style.color : base.color,
    backgroundColor:
      typeof style.backgroundColor === 'string' ? style.backgroundColor : base.backgroundColor,
    textAlign: style.textAlign || base.textAlign,
    letterSpacing: Number.isFinite(style.letterSpacing) ? style.letterSpacing : base.letterSpacing,
    lineHeight: Number.isFinite(style.lineHeight) ? style.lineHeight : base.lineHeight,
    uppercase: Boolean(
      style.uppercase != null ? style.uppercase : base.uppercase
    ),
    italic: Boolean(style.italic != null ? style.italic : base.italic),
    paddingX: Number.isFinite(style.paddingX) ? Math.max(0, style.paddingX) : base.paddingX,
    paddingY: Number.isFinite(style.paddingY) ? Math.max(0, style.paddingY) : base.paddingY,
    borderRadius: Number.isFinite(style.borderRadius) ? Math.max(0, style.borderRadius) : base.borderRadius,
  };

  normalized.shadow = normalizeShadow(style.shadow, base.shadow);
  return normalized;
};

const normalizeKeyframes = (frames = [], fallback = DEFAULT_TEXT_OVERLAY_KEYFRAMES) => {
  const source = Array.isArray(frames) && frames.length ? frames : fallback;
  return source
    .map((frame) => ({
      time: clamp01(frame.time ?? frame.offset ?? frame.position ?? 0),
      opacity: Number.isFinite(frame.opacity) ? clamp01(frame.opacity) : clamp01(frame.alpha ?? 1),
      translateY: Number.isFinite(frame.translateY) ? frame.translateY : 0,
      scale: Number.isFinite(frame.scale) ? frame.scale : 1,
    }))
    .sort((a, b) => a.time - b.time);
};

export const sanitizeTextOverlay = (overlay = {}, fallback = DEFAULT_TEXT_OVERLAY) => {
  const base = fallback || DEFAULT_TEXT_OVERLAY;
  return {
    text: typeof overlay.text === 'string' ? overlay.text : base.text,
    style: normalizeStyle(overlay.style, base.style),
    position: {
      xPercent: clamp01(overlay.position?.xPercent ?? base.position?.xPercent ?? 0.5),
      yPercent: clamp01(overlay.position?.yPercent ?? base.position?.yPercent ?? 0.75),
    },
    anchor: overlay.anchor || base.anchor || 'center',
    keyframes: normalizeKeyframes(overlay.keyframes, base.keyframes),
  };
};

export const interpolateTextOverlay = (overlay, progress) => {
  const data = sanitizeTextOverlay(overlay);
  const clamped = clamp01(progress);
  const frames = data.keyframes.length ? data.keyframes : DEFAULT_TEXT_OVERLAY_KEYFRAMES;

  if (frames.length === 1) {
    return { opacity: frames[0].opacity ?? 1, translateY: frames[0].translateY ?? 0, scale: frames[0].scale ?? 1 };
  }

  let left = frames[0];
  let right = frames[frames.length - 1];

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];
    if (clamped >= current.time && clamped <= next.time) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(0.0001, right.time - left.time);
  const t = clamp01((clamped - left.time) / span);

  const lerp = (a, b) => a + (b - a) * t;

  return {
    opacity: lerp(left.opacity ?? 1, right.opacity ?? 1),
    translateY: lerp(left.translateY ?? 0, right.translateY ?? 0),
    scale: lerp(left.scale ?? 1, right.scale ?? 1),
  };
};

export const createDefaultTextOverlay = () => sanitizeTextOverlay(DEFAULT_TEXT_OVERLAY);
