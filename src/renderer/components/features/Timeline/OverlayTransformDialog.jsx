import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';

const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 180;
const STAGE_MARGIN = 16;
const CAMERA_ASPECT = 16 / 9;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clamp01 = (value) => clamp(value, 0, 1);

const sanitizeOverlay = (value = {}, fallback = {}) => {
  return {
    position: value.position ?? fallback.position ?? 'top-right',
    size: clamp(Number(value.size ?? fallback.size ?? 0.22) || 0.22, 0.1, 0.6),
    borderRadius: clamp(Number(value.borderRadius ?? fallback.borderRadius ?? 12) || 12, 0, 64),
    coordinates:
      value.position === 'custom'
        ? {
            xPercent: clamp01(value.coordinates?.xPercent ?? 0.5),
            yPercent: clamp01(value.coordinates?.yPercent ?? 0.5),
          }
        : value.coordinates ?? null,
  };
};

const computeOverlayRect = (overlay) => {
  const size = clamp(overlay?.size ?? 0.22, 0.1, 0.6);
  let width = Math.round(STAGE_WIDTH * size);
  let height = Math.round(width / CAMERA_ASPECT);

  const maxWidth = Math.max(60, STAGE_WIDTH - STAGE_MARGIN * 2);
  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / CAMERA_ASPECT);
  }

  const maxHeight = Math.max(40, STAGE_HEIGHT - STAGE_MARGIN * 2);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * CAMERA_ASPECT);
  }

  width = clamp(width, 60, maxWidth);
  height = clamp(height, 40, maxHeight);

  const safeWidth = Math.max(0, STAGE_WIDTH - STAGE_MARGIN * 2 - width);
  const safeHeight = Math.max(0, STAGE_HEIGHT - STAGE_MARGIN * 2 - height);

  let x = STAGE_MARGIN;
  let y = STAGE_MARGIN;

  if (overlay?.position === 'custom' && overlay?.coordinates) {
    const xPercent = clamp01(overlay.coordinates.xPercent ?? 0.5);
    const yPercent = clamp01(overlay.coordinates.yPercent ?? 0.5);
    x = STAGE_MARGIN + (safeWidth > 0 ? xPercent * safeWidth : 0);
    y = STAGE_MARGIN + (safeHeight > 0 ? yPercent * safeHeight : 0);
  } else {
    switch (overlay?.position) {
      case 'top-left':
        x = STAGE_MARGIN;
        y = STAGE_MARGIN;
        break;
      case 'bottom-left':
        x = STAGE_MARGIN;
        y = STAGE_MARGIN + safeHeight;
        break;
      case 'bottom-right':
        x = STAGE_MARGIN + safeWidth;
        y = STAGE_MARGIN + safeHeight;
        break;
      case 'center':
        x = (STAGE_WIDTH - width) / 2;
        y = (STAGE_HEIGHT - height) / 2;
        break;
      case 'top-right':
      default:
        x = STAGE_MARGIN + safeWidth;
        y = STAGE_MARGIN;
        break;
    }
  }

  return { x, y, width, height };
};

const getCoordinatesFromRect = (x, y, width, height) => {
  const safeWidth = Math.max(0, STAGE_WIDTH - STAGE_MARGIN * 2 - width);
  const safeHeight = Math.max(0, STAGE_HEIGHT - STAGE_MARGIN * 2 - height);
  const xPercent = safeWidth > 0 ? clamp01((x - STAGE_MARGIN) / safeWidth) : 0;
  const yPercent = safeHeight > 0 ? clamp01((y - STAGE_MARGIN) / safeHeight) : 0;
  return { xPercent, yPercent };
};

const PRESET_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'center', label: 'Center' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

export function OverlayTransformDialog({
  isOpen,
  onClose,
  onApply,
  initialValue,
  referenceOverlay,
}) {
  const [draft, setDraft] = useState(() => sanitizeOverlay(initialValue, referenceOverlay));
  const stageRef = useRef(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(sanitizeOverlay(initialValue, referenceOverlay));
  }, [initialValue, isOpen, referenceOverlay]);

  const rect = useMemo(() => computeOverlayRect(draft), [draft]);

  const handlePreset = useCallback(
    (position) => {
      setDraft((prev) =>
        sanitizeOverlay(
          {
            ...prev,
            position,
            coordinates: position === 'custom' ? prev.coordinates : null,
          },
          referenceOverlay
        )
      );
    },
    [referenceOverlay]
  );

  const handleSizeChange = useCallback((nextSize) => {
    setDraft((prev) =>
      sanitizeOverlay(
        {
          ...prev,
          size: nextSize,
        },
        referenceOverlay
      )
    );
  }, [referenceOverlay]);

  const handleBorderRadiusChange = useCallback((nextRadius) => {
    setDraft((prev) =>
      sanitizeOverlay(
        {
          ...prev,
          borderRadius: nextRadius,
        },
        referenceOverlay
      )
    );
  }, [referenceOverlay]);

  const startDrag = useCallback(
    (event) => {
      if (!stageRef.current) return;
      event.preventDefault();
      const stageRect = stageRef.current.getBoundingClientRect();
      dragStateRef.current = {
        pointerStartX: event.clientX,
        pointerStartY: event.clientY,
        rect,
        stageRect,
      };

      const handleMove = (moveEvent) => {
        if (!dragStateRef.current) return;
        moveEvent.preventDefault();

        const deltaX = moveEvent.clientX - dragStateRef.current.pointerStartX;
        const deltaY = moveEvent.clientY - dragStateRef.current.pointerStartY;

        const { rect: currentRect, stageRect: currentStage } = dragStateRef.current;

        const stageWidth = currentStage.width;
        const stageHeight = currentStage.height;

        const safeMargin = STAGE_MARGIN * (stageWidth / STAGE_WIDTH);
        const width = currentRect.width;
        const height = currentRect.height;
        const safeWidth = Math.max(0, stageWidth - width - safeMargin * 2);
        const safeHeight = Math.max(0, stageHeight - height - safeMargin * 2);

        let nextX = currentRect.x + deltaX;
        let nextY = currentRect.y + deltaY;

        const minX = safeMargin;
        const maxX = safeMargin + safeWidth;
        const minY = safeMargin;
        const maxY = safeMargin + safeHeight;

        nextX = clamp(nextX, minX, maxX);
        nextY = clamp(nextY, minY, maxY);

        const coords = getCoordinatesFromRect(
          nextX * (STAGE_WIDTH / stageWidth),
          nextY * (STAGE_HEIGHT / stageHeight),
          rect.width,
          rect.height
        );

        setDraft((prev) =>
          sanitizeOverlay(
            {
              ...prev,
              position: 'custom',
              coordinates: coords,
            },
            referenceOverlay
          )
        );
      };

      const handleUp = () => {
        dragStateRef.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [rect, referenceOverlay]
  );

  const handleApply = useCallback(() => {
    onApply?.(sanitizeOverlay(draft, referenceOverlay));
    onClose?.();
  }, [draft, onApply, onClose, referenceOverlay]);

  const handleReset = useCallback(() => {
    setDraft(sanitizeOverlay(referenceOverlay));
  }, [referenceOverlay]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Picture-in-Picture Transform" size="lg">
      <div className="flex flex-col gap-6">
        <section>
          <h4 className="text-sm font-semibold text-zinc-200 mb-3">Position Presets</h4>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_POSITIONS.map((preset) => (
              <Button
                key={preset.id}
                size="sm"
                variant={draft.position === preset.id ? 'secondary' : 'ghost'}
                onClick={() => handlePreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant={draft.position === 'custom' ? 'secondary' : 'ghost'}
              onClick={() =>
                setDraft((prev) =>
                  sanitizeOverlay(
                    {
                      ...prev,
                      position: 'custom',
                      coordinates: prev.coordinates ?? { xPercent: 0.5, yPercent: 0.5 },
                    },
                    referenceOverlay
                  )
                )
              }
            >
              Custom
            </Button>
          </div>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-zinc-200 mb-3">Preview</h4>
          <div
            ref={stageRef}
            className="relative border border-dashed border-white/15 rounded-lg bg-zinc-900/70"
            style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
          >
            <div className="absolute inset-0">
              <div
                className="absolute border border-indigo-400/80 bg-indigo-500/20 cursor-grab active:cursor-grabbing shadow-lg transition-shadow"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  borderRadius: draft.borderRadius ?? 12,
                }}
                onPointerDown={startDrag}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
              <span>Overlay Size</span>
              <span>{Math.round(draft.size * 100)}%</span>
            </div>
            <Slider
              min={0.1}
              max={0.6}
              step={0.01}
              value={draft.size}
              onChange={handleSizeChange}
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
              <span>Border Radius</span>
              <span>{Math.round(draft.borderRadius ?? 12)}</span>
            </div>
            <Slider
              min={0}
              max={64}
              step={1}
              value={draft.borderRadius ?? 12}
              onChange={handleBorderRadiusChange}
            />
          </div>
        </section>

        <footer className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            {draft.position === 'custom' && draft.coordinates
              ? `Custom position • X ${(draft.coordinates.xPercent * 100).toFixed(0)}% · Y ${(draft.coordinates.yPercent * 100).toFixed(0)}%`
              : `Preset: ${draft.position}`}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleReset}>
              Reset to Recording
            </Button>
            <Button size="sm" variant="secondary" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
