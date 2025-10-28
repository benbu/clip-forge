import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { useRecordingStore } from '@/store/recordingStore';
import { OVERLAY_POSITIONS } from './RecordingSetupModal';
import { X, Maximize2 } from 'lucide-react';

const STAGE_WIDTH = 240;
const STAGE_HEIGHT = 135;
const STAGE_MARGIN = 12;
const CAMERA_ASPECT = 16 / 9;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clamp01 = (value) => clamp(value, 0, 1);

const getOverlayRect = (overlay) => {
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

  return {
    x,
    y,
    width,
    height,
  };
};

const computeCoordinatesFromPosition = (x, y, width, height) => {
  const safeWidth = Math.max(0, STAGE_WIDTH - STAGE_MARGIN * 2 - width);
  const safeHeight = Math.max(0, STAGE_HEIGHT - STAGE_MARGIN * 2 - height);
  const xPercent = safeWidth > 0 ? clamp01((x - STAGE_MARGIN) / safeWidth) : 0;
  const yPercent = safeHeight > 0 ? clamp01((y - STAGE_MARGIN) / safeHeight) : 0;
  return { xPercent, yPercent };
};

const useOutsideClick = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, ref]);
};

export function RecordingOverlayEditor({ anchorRect, onClose }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);

  const overlay = useRecordingStore((state) => state.overlay);
  const cameraEnabled = useRecordingStore((state) => state.cameraEnabled);
  const setOverlayPosition = useRecordingStore((state) => state.setOverlayPosition);
  const setOverlaySize = useRecordingStore((state) => state.setOverlaySize);
  const setOverlayBorderRadius = useRecordingStore((state) => state.setOverlayBorderRadius);
  const setOverlayCoordinates = useRecordingStore((state) => state.setOverlayCoordinates);
  const setCameraEnabled = useRecordingStore((state) => state.setCameraEnabled);

  const [positionStyle, setPositionStyle] = useState({ top: 0, left: 0 });

  const overlayRect = useMemo(() => getOverlayRect(overlay), [overlay]);

  useEffect(() => {
    if (!anchorRect) return;
    const padding = 12;
    const width = 320;
    const height = 360;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchorRect.left;
    let top = anchorRect.bottom + 8;

    if (left + width + padding > viewportWidth) {
      left = viewportWidth - width - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top + height + padding > viewportHeight) {
      top = anchorRect.top - height - 8;
      if (top < padding) {
        top = padding;
      }
    }

    setPositionStyle({ top, left, width });
  }, [anchorRect]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useOutsideClick(containerRef, () => onClose?.());

  const updateCoordinatesFromPoint = useCallback(
    (clientX, clientY, offsetX = 0, offsetY = 0, dimensions = overlayRect) => {
      const stage = stageRef.current;
      if (!stage) return;
      const bounds = stage.getBoundingClientRect();
      const pointerX = clientX - bounds.left;
      const pointerY = clientY - bounds.top;

      const clampedX = clamp(
        pointerX - offsetX,
        STAGE_MARGIN,
        STAGE_WIDTH - STAGE_MARGIN - dimensions.width
      );
      const clampedY = clamp(
        pointerY - offsetY,
        STAGE_MARGIN,
        STAGE_HEIGHT - STAGE_MARGIN - dimensions.height
      );

      const coordinates = computeCoordinatesFromPosition(
        clampedX,
        clampedY,
        dimensions.width,
        dimensions.height
      );
      setOverlayCoordinates(coordinates);
    },
    [overlayRect, setOverlayCoordinates]
  );

  const handleStageClick = useCallback(
    (event) => {
      event.preventDefault();
      updateCoordinatesFromPoint(event.clientX, event.clientY, overlayRect.width / 2, overlayRect.height / 2);
      setOverlayPosition('custom');
    },
    [overlayRect.height, overlayRect.width, setOverlayPosition, updateCoordinatesFromPoint]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (dragStateRef.current) {
        updateCoordinatesFromPoint(
          event.clientX,
          event.clientY,
          dragStateRef.current.offsetX,
          dragStateRef.current.offsetY,
          dragStateRef.current.dimensions
        );
        setOverlayPosition('custom');
        return;
      }

      if (resizeStateRef.current) {
        const { originX, originY } = resizeStateRef.current;
        const stage = stageRef.current;
        if (!stage) return;
        const bounds = stage.getBoundingClientRect();
        const pointerX = clamp(event.clientX - bounds.left, originX + 40, STAGE_WIDTH - STAGE_MARGIN);
        const pointerY = clamp(event.clientY - bounds.top, originY + 30, STAGE_HEIGHT - STAGE_MARGIN);

        let newWidth = pointerX - originX;
        let newHeight = Math.round(newWidth / CAMERA_ASPECT);

        if (originY + newHeight + STAGE_MARGIN > STAGE_HEIGHT) {
          newHeight = STAGE_HEIGHT - STAGE_MARGIN - originY;
          newWidth = Math.round(newHeight * CAMERA_ASPECT);
        }

        const sizeRatio = clamp(newWidth / STAGE_WIDTH, 0.1, 0.6);
        setOverlaySize(sizeRatio);

        const coordinates = computeCoordinatesFromPosition(
          originX,
          originY,
          newWidth,
          newHeight
        );
        setOverlayCoordinates(coordinates);
        setOverlayPosition('custom');
      }
    },
    [setOverlayCoordinates, setOverlayPosition, setOverlaySize, updateCoordinatesFromPoint]
  );

  const stopInteractions = useCallback(() => {
    dragStateRef.current = null;
    resizeStateRef.current = null;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', stopInteractions);
  }, [handlePointerMove]);

  useEffect(() => () => stopInteractions(), [stopInteractions]);

  const beginDrag = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopInteractions();
      dragStateRef.current = {
        offsetX: event.nativeEvent.offsetX,
        offsetY: event.nativeEvent.offsetY,
        dimensions: overlayRect,
      };
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', stopInteractions);
    },
    [handlePointerMove, overlayRect, stopInteractions]
  );

  const beginResize = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopInteractions();
      const originX = overlayRect.x;
      const originY = overlayRect.y;
      resizeStateRef.current = {
        originX,
        originY,
        };
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', stopInteractions);
      },
    [handlePointerMove, overlayRect, stopInteractions]
  );

  const handlePresetClick = useCallback(
    (position) => {
      setOverlayPosition(position);
    },
    [setOverlayPosition]
  );

  const overlayPositionLabel = useMemo(() => {
    if (overlay?.position === 'custom') return 'Custom';
    const preset = OVERLAY_POSITIONS.find((pos) => pos === overlay?.position);
    if (!preset) return 'Top Right';
    return preset
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [overlay?.position]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={containerRef}
      className="fixed z-[1300] rounded-lg border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-md"
      style={{ top: positionStyle.top, left: positionStyle.left, width: positionStyle.width || 320 }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">PiP Overlay</p>
          <p className="text-xs text-zinc-400">{overlayPositionLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Maximize2 className="h-4 w-4" />}
            onClick={() => setOverlayPosition('center')}
            tooltip="Center"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<X className="h-4 w-4" />}
            onClick={onClose}
            tooltip="Close"
          />
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {!cameraEnabled ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            Enable the webcam overlay to adjust PiP layout.
            <Button
              size="sm"
              className="mt-2"
              onClick={() => setCameraEnabled(true)}
            >
              Enable PiP
            </Button>
          </div>
        ) : (
          <div>
            <div
              ref={stageRef}
              className="relative mx-auto rounded-lg border border-white/10 bg-zinc-950"
              style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
              onPointerDown={handleStageClick}
            >
              <div
                className="absolute inset-[12px] border border-dashed border-white/10 pointer-events-none"
              />

              <div
                className="absolute border-2 border-indigo-400/80 bg-indigo-500/20 shadow-lg cursor-grab active:cursor-grabbing"
                style={{
                  left: overlayRect.x,
                  top: overlayRect.y,
                  width: overlayRect.width,
                  height: overlayRect.height,
                  borderRadius: overlay?.borderRadius ?? 12,
                }}
                onPointerDown={beginDrag}
              >
                <div
                  className="absolute bottom-1 right-1 h-4 w-4 rounded-sm bg-indigo-400 cursor-se-resize"
                  onPointerDown={beginResize}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500 text-center">
              Drag the overlay to reposition. Use the corner handle to resize.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Size ({Math.round((overlay?.size ?? 0.22) * 100)}%)</label>
            <Slider
              min={10}
              max={60}
              step={1}
              value={(overlay?.size ?? 0.22) * 100}
              onValueChange={([value]) => setOverlaySize(clamp(value / 100, 0.1, 0.6))}
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Corner rounding ({overlay?.borderRadius ?? 12}px)</label>
            <Slider
              min={0}
              max={48}
              step={2}
              value={overlay?.borderRadius ?? 12}
              onValueChange={([value]) => setOverlayBorderRadius(value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {OVERLAY_POSITIONS.map((position) => (
              <Button
                key={position}
                size="sm"
                variant={overlay?.position === position ? 'primary' : 'ghost'}
                onClick={() => handlePresetClick(position)}
              >
                {position
                  .split('-')
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(' ')}
              </Button>
            ))}
            <Button
              size="sm"
              variant={overlay?.position === 'custom' ? 'primary' : 'ghost'}
              onClick={() => setOverlayPosition('custom')}
            >
              Custom
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
