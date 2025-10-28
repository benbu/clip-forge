import React, { useState, useRef, useEffect } from 'react';

export function ResizablePanel({
  id,
  children,
  defaultSize = 280,
  minSize = 200,
  maxSize = 600,
  side = 'left',
  onResize,
  className = ''
}) {
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(`panel-${id}-size`);
    return saved ? parseInt(saved, 10) : defaultSize;
  });
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = size;

    const handleMouseMove = (e) => {
      const isHorizontal = side === 'left' || side === 'right';
      const delta = isHorizontal ? e.clientX - startX : e.clientY - startY;
      
      // Calculate new size based on side
      let newSize;
      if (side === 'left') {
        // Left panel: dragging right increases size
        newSize = startSize + delta;
      } else if (side === 'right') {
        // Right panel: dragging left increases size
        newSize = startSize - delta;
      } else if (side === 'top') {
        // Bottom panel (resized from top): dragging up increases size
        newSize = startSize - delta;
      } else {
        // Other vertical panels
        newSize = startSize + delta;
      }

      // Clamp to min/max
      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      
      setSize(newSize);
      if (onResize) onResize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Save to localStorage when size changes
  useEffect(() => {
    localStorage.setItem(`panel-${id}-size`, size.toString());
  }, [size, id]);

  // Prevent text selection while resizing
  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = side === 'left' || side === 'right' ? 'ew-resize' : 'ns-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, side]);

  const isHorizontal = side === 'left' || side === 'right';
  // Resize handle should appear BEFORE for 'top' and 'right', AFTER for 'left'
  const handleBefore = side === 'top' || side === 'right';
  const primaryStyle = isHorizontal
    ? { width: `${size}px` }
    : { height: `${size}px`, width: '100%' };

  return (
    <>
      {handleBefore && (
        <div
          className={`
            resize-handle group/resize
            ${isHorizontal ? 'w-1 h-full cursor-ew-resize' : 'h-1 w-full cursor-ns-resize'}
            bg-transparent hover:bg-indigo-500/50 transition-colors
            ${isResizing ? 'bg-indigo-500/70' : ''}
          `}
          onMouseDown={handleMouseDown}
          title={side === 'top' ? 'Drag to resize timeline height' : (isHorizontal ? 'Drag to resize' : 'Drag to resize height')}
        >
          <div className={`
            ${isHorizontal ? 'w-full h-12' : 'h-full w-12'}
            opacity-0 group-hover/resize:opacity-100 
            ${isHorizontal ? 'cursor-ew-resize' : 'cursor-ns-resize'}
          `} />
        </div>
      )}
      
      <div
        ref={panelRef}
        className={`${className} overflow-hidden`}
        style={{
          ...primaryStyle,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </div>
      
      {!handleBefore && (
        <div
          className={`
            resize-handle group/resize
            ${isHorizontal ? 'w-1 h-full cursor-ew-resize' : 'h-1 w-full cursor-ns-resize'}
            ${side === 'left' ? 'cursor-w-resize' : side === 'right' ? 'cursor-e-resize' : ''}
            bg-transparent hover:bg-indigo-500/50 transition-colors
            ${isResizing ? 'bg-indigo-500/70' : ''}
          `}
          onMouseDown={handleMouseDown}
          title={isHorizontal ? 'Drag to resize' : 'Drag to resize height'}
        >
          <div className={`
            ${isHorizontal ? 'w-full h-12' : 'h-full w-12'}
            opacity-0 group-hover/resize:opacity-100 
            ${isHorizontal ? 'cursor-ew-resize' : 'cursor-ns-resize'}
          `} />
        </div>
      )}
    </>
  );
}
