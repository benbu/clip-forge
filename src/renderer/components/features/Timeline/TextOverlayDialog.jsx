import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { createDefaultTextOverlay, sanitizeTextOverlay } from '@/lib/textOverlay';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clamp01 = (value) => clamp(Number.isFinite(value) ? value : 0, 0, 1);

const DEFAULT_FADE_IN = 0.08;
const DEFAULT_FADE_OUT = 0.12;

const PICKER_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'middle-left', label: 'Mid Left' },
  { id: 'middle-center', label: 'Center' },
  { id: 'middle-right', label: 'Mid Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

const defaultOverlay = createDefaultTextOverlay();

const normalizeOverlay = (overlay) => sanitizeTextOverlay(overlay, defaultOverlay);

const rgbaToHexAlpha = (value) => {
  if (typeof value !== 'string' || !value.length) {
    return { hex: '#000000', alpha: 0.45 };
  }

  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed.slice(0, 7);
    return { hex: hex.toLowerCase(), alpha: 1 };
  }

  const rgbaMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (!rgbaMatch) {
    return { hex: '#000000', alpha: 0.45 };
  }

  const parts = rgbaMatch[1]
    .split(',')
    .map((part) => part.trim())
    .map((part) => part.replace(/%/g, ''));

  if (parts.length < 3) {
    return { hex: '#000000', alpha: 0.45 };
  }

  const [r, g, b] = parts.slice(0, 3).map((component) => clamp(Math.round(Number(component) || 0), 0, 255));
  const alpha = parts[3] != null ? clamp(Number(parts[3]) || 0, 0, 1) : 1;

  const hex = `#${[r, g, b]
    .map((component) => component.toString(16).padStart(2, '0'))
    .join('')}`;

  return { hex, alpha };
};

const hexAlphaToRgba = (hex, alpha = 1) => {
  const safeAlpha = clamp(Number(alpha) || 0, 0, 1);
  if (!hex || typeof hex !== 'string') {
    return `rgba(0, 0, 0, ${safeAlpha.toFixed(2)})`;
  }

  const sanitized = hex.trim().replace('#', '');
  if (sanitized.length !== 6) {
    return `rgba(0, 0, 0, ${safeAlpha.toFixed(2)})`;
  }
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha.toFixed(2)})`;
};

const deriveFadeDurations = (overlay) => {
  const frames = Array.isArray(overlay?.keyframes) ? overlay.keyframes : [];
  if (frames.length < 4) {
    return { fadeIn: DEFAULT_FADE_IN, fadeOut: DEFAULT_FADE_OUT };
  }

  const sorted = [...frames].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  const fadeInTime = clamp01(sorted[1]?.time ?? DEFAULT_FADE_IN);
  const fadeOutStart = clamp01(sorted[sorted.length - 2]?.time ?? (1 - DEFAULT_FADE_OUT));
  const fadeOut = clamp01(1 - fadeOutStart);
  return {
    fadeIn: fadeInTime,
    fadeOut: fadeOut || DEFAULT_FADE_OUT,
  };
};

const buildKeyframes = (fadeIn, fadeOut) => {
  const safeFadeIn = clamp01(fadeIn);
  const safeFadeOut = clamp01(fadeOut);
  const fadeOutStart = clamp01(1 - safeFadeOut);
  const plateauStart = Math.min(safeFadeIn || 0.001, 0.35);
  const plateauEnd = Math.max(plateauStart, fadeOutStart || 0.7);

  return [
    { time: 0, opacity: 0, translateY: 24 },
    { time: plateauStart, opacity: 1, translateY: 0 },
    { time: plateauEnd, opacity: 1, translateY: 0 },
    { time: 1, opacity: 0, translateY: -12 },
  ];
};

const getPositionFromPreset = (preset) => {
  switch (preset) {
    case 'top-left':
      return { xPercent: 0.15, yPercent: 0.18 };
    case 'top-center':
      return { xPercent: 0.5, yPercent: 0.16 };
    case 'top-right':
      return { xPercent: 0.85, yPercent: 0.18 };
    case 'middle-left':
      return { xPercent: 0.18, yPercent: 0.5 };
    case 'middle-center':
      return { xPercent: 0.5, yPercent: 0.5 };
    case 'middle-right':
      return { xPercent: 0.82, yPercent: 0.5 };
    case 'bottom-left':
      return { xPercent: 0.18, yPercent: 0.86 };
    case 'bottom-center':
      return { xPercent: 0.5, yPercent: 0.88 };
    case 'bottom-right':
      return { xPercent: 0.82, yPercent: 0.86 };
    default:
      return { xPercent: 0.5, yPercent: 0.75 };
  }
};

export function TextOverlayDialog({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
  submitLabel = 'Save Overlay',
}) {
  const [overlay, setOverlay] = useState(() => normalizeOverlay(initialValue));
  const [{ fadeIn, fadeOut }, setFadeDurations] = useState(() => deriveFadeDurations(overlay));
  const [{ backgroundHex, backgroundAlpha }, setBackgroundColor] = useState(() => {
    const parsed = rgbaToHexAlpha(overlay?.style?.backgroundColor);
    return { backgroundHex: parsed.hex, backgroundAlpha: parsed.alpha };
  });

  useEffect(() => {
    if (!isOpen) return;
    const normalized = normalizeOverlay(initialValue);
    setOverlay(normalized);
    setFadeDurations(deriveFadeDurations(normalized));
    const parsed = rgbaToHexAlpha(normalized?.style?.backgroundColor);
    setBackgroundColor({ backgroundHex: parsed.hex, backgroundAlpha: parsed.alpha });
  }, [initialValue, isOpen]);

  const previewOverlay = useMemo(() => normalizeOverlay(overlay), [overlay]);
  const previewStyle = useMemo(() => {
    const style = previewOverlay.style ?? {};
    return {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontSize: `${style.fontSize ?? 48}px`,
      color: style.color,
      backgroundColor: style.backgroundColor,
      textAlign: style.textAlign ?? 'center',
      letterSpacing: `${style.letterSpacing ?? 0}px`,
      lineHeight: style.lineHeight ?? 1.1,
      textTransform: style.uppercase ? 'uppercase' : 'none',
      fontStyle: style.italic ? 'italic' : 'normal',
      padding: `${style.paddingY ?? 18}px ${style.paddingX ?? 32}px`,
      borderRadius: `${style.borderRadius ?? 12}px`,
      boxShadow: style.shadow
        ? `${style.shadow.offsetX ?? 0}px ${style.shadow.offsetY ?? 2}px ${style.shadow.blur ?? 24}px ${style.shadow.color ?? 'rgba(0, 0, 0, 0.55)'}`
        : 'none',
      maxWidth: '80%',
      margin: '0 auto',
      transition: 'all 0.3s ease',
    };
  }, [previewOverlay]);

  const handleStyleChange = (prop, value) => {
    setOverlay((prev) => ({
      ...prev,
      style: {
        ...prev.style,
        [prop]: value,
      },
    }));
  };

  const handleShadowChange = (prop, value) => {
    setOverlay((prev) => ({
      ...prev,
      style: {
        ...prev.style,
        shadow: {
          ...(prev.style?.shadow ?? {}),
          [prop]: value,
        },
      },
    }));
  };

  const handleFadeChange = (type, nextValue) => {
    setFadeDurations((prev) => {
      const updated = {
        fadeIn: type === 'fadeIn' ? clamp01(nextValue) : prev.fadeIn,
        fadeOut: type === 'fadeOut' ? clamp01(nextValue) : prev.fadeOut,
      };
      setOverlay((prevOverlay) => ({
        ...prevOverlay,
        keyframes: buildKeyframes(updated.fadeIn, updated.fadeOut),
      }));
      return updated;
    });
  };

  const handleBackgroundHex = (nextHex) => {
    setBackgroundColor((prev) => ({ backgroundHex: nextHex, backgroundAlpha: prev.backgroundAlpha }));
    handleStyleChange('backgroundColor', hexAlphaToRgba(nextHex, backgroundAlpha));
  };

  const handleBackgroundAlpha = (nextAlpha) => {
    const alpha = clamp(nextAlpha / 100, 0, 1);
    setBackgroundColor((prev) => ({ backgroundHex: prev.backgroundHex, backgroundAlpha: alpha }));
    handleStyleChange('backgroundColor', hexAlphaToRgba(backgroundHex, alpha));
  };

  const handlePositionPreset = (preset) => {
    const { xPercent, yPercent } = getPositionFromPreset(preset);
    setOverlay((prev) => ({
      ...prev,
      position: {
        xPercent,
        yPercent,
      },
    }));
  };

  const handleSubmit = () => {
    const normalized = normalizeOverlay({
      ...overlay,
      keyframes: buildKeyframes(fadeIn, fadeOut),
    });
    onSubmit?.(normalized);
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Text Overlay" size="xl">
      <div className="flex flex-col gap-8">
        <section className="grid gap-3">
          <h4 className="text-sm font-semibold text-zinc-200">Overlay Text</h4>
          <textarea
            className="w-full min-h-[96px] rounded-md border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            value={overlay.text ?? ''}
            onChange={(event) => setOverlay((prev) => ({ ...prev, text: event.target.value }))}
            placeholder="Add your overlay text..."
          />
        </section>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-200">Typography</h4>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                Uppercase
                <Switch
                  checked={Boolean(overlay?.style?.uppercase)}
                  onChange={(value) => handleStyleChange('uppercase', Boolean(value))}
                />
              </span>
              <span className="flex items-center gap-2">
                Italic
                <Switch
                  checked={Boolean(overlay?.style?.italic)}
                  onChange={(value) => handleStyleChange('italic', Boolean(value))}
                />
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Font Size</span>
                <span>{overlay?.style?.fontSize ?? 48}px</span>
              </div>
              <Slider
                min={16}
                max={128}
                step={1}
                value={overlay?.style?.fontSize ?? 48}
                onChange={(value) => handleStyleChange('fontSize', Math.round(value))}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Font Weight</span>
                <span>{overlay?.style?.fontWeight ?? 600}</span>
              </div>
              <Slider
                min={300}
                max={900}
                step={50}
                value={overlay?.style?.fontWeight ?? 600}
                onChange={(value) => handleStyleChange('fontWeight', Math.round(value / 50) * 50)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Line Height</span>
                  <span>{(overlay?.style?.lineHeight ?? 1.1).toFixed(2)}</span>
                </div>
                <Slider
                  min={0.8}
                  max={2}
                  step={0.02}
                  value={overlay?.style?.lineHeight ?? 1.1}
                  onChange={(value) => handleStyleChange('lineHeight', Number(value.toFixed(2)))}
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Letter Spacing</span>
                  <span>{(overlay?.style?.letterSpacing ?? 0).toFixed(1)}px</span>
                </div>
                <Slider
                  min={-2}
                  max={12}
                  step={0.1}
                  value={overlay?.style?.letterSpacing ?? 0}
                  onChange={(value) => handleStyleChange('letterSpacing', Number(value.toFixed(1)))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <h4 className="text-sm font-semibold text-zinc-200">Color & Background</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
              <span>Text Color</span>
              <Input
                type="color"
                value={overlay?.style?.color ?? '#ffffff'}
                onChange={(event) => handleStyleChange('color', event.target.value)}
                className="h-10 w-16 cursor-pointer"
              />
            </label>

            <div className="rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2">
              <div className="flex items-center justify-between text-sm text-zinc-200">
                <span>Background</span>
                <Input
                  type="color"
                  value={backgroundHex}
                  onChange={(event) => handleBackgroundHex(event.target.value)}
                  className="h-10 w-16 cursor-pointer"
                />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Opacity</span>
                  <span>{Math.round((backgroundAlpha ?? 0) * 100)}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round((backgroundAlpha ?? 0) * 100)}
                  onChange={handleBackgroundAlpha}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Padding X</span>
                <span>{overlay?.style?.paddingX ?? 32}px</span>
              </div>
              <Slider
                min={8}
                max={64}
                step={1}
                value={overlay?.style?.paddingX ?? 32}
                onChange={(value) => handleStyleChange('paddingX', Math.round(value))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Padding Y</span>
                <span>{overlay?.style?.paddingY ?? 18}px</span>
              </div>
              <Slider
                min={4}
                max={48}
                step={1}
                value={overlay?.style?.paddingY ?? 18}
                onChange={(value) => handleStyleChange('paddingY', Math.round(value))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Corner Radius</span>
                <span>{overlay?.style?.borderRadius ?? 12}px</span>
              </div>
              <Slider
                min={0}
                max={48}
                step={1}
                value={overlay?.style?.borderRadius ?? 12}
                onChange={(value) => handleStyleChange('borderRadius', Math.round(value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Shadow Blur</span>
                <span>{overlay?.style?.shadow?.blur ?? 24}px</span>
              </div>
              <Slider
                min={0}
                max={48}
                step={1}
                value={overlay?.style?.shadow?.blur ?? 24}
                onChange={(value) => handleShadowChange('blur', Math.round(value))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Shadow X</span>
                <span>{overlay?.style?.shadow?.offsetX ?? 0}px</span>
              </div>
              <Slider
                min={-32}
                max={32}
                step={1}
                value={overlay?.style?.shadow?.offsetX ?? 0}
                onChange={(value) => handleShadowChange('offsetX', Math.round(value))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Shadow Y</span>
                <span>{overlay?.style?.shadow?.offsetY ?? 2}px</span>
              </div>
              <Slider
                min={-32}
                max={32}
                step={1}
                value={overlay?.style?.shadow?.offsetY ?? 2}
                onChange={(value) => handleShadowChange('offsetY', Math.round(value))}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-200">Position</h4>
            <div className="flex flex-wrap gap-2">
              {PICKER_POSITIONS.map((preset) => {
                const { xPercent, yPercent } = getPositionFromPreset(preset.id);
                const isActive =
                  Math.abs((overlay?.position?.xPercent ?? 0.5) - xPercent) < 0.05 &&
                  Math.abs((overlay?.position?.yPercent ?? 0.75) - yPercent) < 0.05;
                return (
                  <Button
                    key={preset.id}
                    size="sm"
                    variant={isActive ? 'secondary' : 'ghost'}
                    onClick={() => handlePositionPreset(preset.id)}
                    type="button"
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Horizontal</span>
                <span>{Math.round((overlay?.position?.xPercent ?? 0.5) * 100)}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={Math.round((overlay?.position?.xPercent ?? 0.5) * 100)}
                onChange={(value) => setOverlay((prev) => ({
                  ...prev,
                  position: {
                    ...prev.position,
                    xPercent: clamp01(value / 100),
                  },
                }))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Vertical</span>
                <span>{Math.round((overlay?.position?.yPercent ?? 0.75) * 100)}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={Math.round((overlay?.position?.yPercent ?? 0.75) * 100)}
                onChange={(value) => setOverlay((prev) => ({
                  ...prev,
                  position: {
                    ...prev.position,
                    yPercent: clamp01(value / 100),
                  },
                }))}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <h4 className="text-sm font-semibold text-zinc-200">Animation</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Fade In</span>
                <span>{Math.round(fadeIn * 100)}%</span>
              </div>
              <Slider
                min={0}
                max={40}
                step={1}
                value={Math.round(fadeIn * 100)}
                onChange={(value) => handleFadeChange('fadeIn', value / 100)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Fade Out</span>
                <span>{Math.round(fadeOut * 100)}%</span>
              </div>
              <Slider
                min={0}
                max={40}
                step={1}
                value={Math.round(fadeOut * 100)}
                onChange={(value) => handleFadeChange('fadeOut', value / 100)}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <h4 className="text-sm font-semibold text-zinc-200">Preview</h4>
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 px-6 py-10">
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute"
                style={{
                  left: `${(previewOverlay?.position?.xPercent ?? 0.5) * 100}%`,
                  top: `${(previewOverlay?.position?.yPercent ?? 0.75) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '80%',
                }}
              >
                <div style={previewStyle}>
                  {previewOverlay?.text ?? 'New overlay text'}
                </div>
              </div>
            </div>
            <div className="aspect-video w-full rounded-md border border-dashed border-white/10" />
          </div>
        </section>

        <footer className="flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSubmit} type="button">
            {submitLabel}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

