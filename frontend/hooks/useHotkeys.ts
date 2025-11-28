'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useStudioEditor } from './useStudioEditor';

/**
 * Hotkey definitions following Photoshop conventions
 * Maps keyboard shortcuts to editor actions
 */
interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

/**
 * Custom hook for handling keyboard shortcuts in the studio editor
 * Provides Photoshop-like keyboard shortcuts for tools, actions, and navigation
 */
export function useHotkeys() {
  const {
    // Tools
    setActiveTool,
    activeTool,
    // Colors
    swapColors,
    setPrimaryColor,
    setSecondaryColor,
    // Zoom/Pan
    zoom,
    setZoom,
    setPan,
    panX,
    panY,
    // History
    undo,
    redo,
    // Layers
    layers,
    activeLayerId,
    setActiveLayer,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
    toggleLayerVisibility,
    // Selection
    clearSelection,
    hasSelection,
    setSelection,
    // Canvas dimensions
    canvasWidth,
    canvasHeight,
    // Brush
    currentBrush,
    updateBrush,
  } = useStudioEditor();

  // Clipboard state for copy/paste
  const clipboardRef = useRef<{
    type: 'layer' | 'selection' | null;
    data: unknown;
  }>({ type: null, data: null });

  /**
   * Copy selected layer or selection to clipboard
   */
  const handleCopy = useCallback(() => {
    if (activeLayerId) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (layer) {
        clipboardRef.current = {
          type: 'layer',
          data: JSON.parse(JSON.stringify(layer)),
        };
        console.log('Copied layer:', layer.name);
      }
    }
  }, [activeLayerId, layers]);

  /**
   * Cut selected layer (copy + delete)
   */
  const handleCut = useCallback(() => {
    handleCopy();
    if (activeLayerId && layers.length > 1) {
      removeLayer(activeLayerId);
    }
  }, [handleCopy, activeLayerId, layers.length, removeLayer]);

  /**
   * Paste from clipboard
   */
  const handlePaste = useCallback(() => {
    if (clipboardRef.current.type === 'layer' && clipboardRef.current.data) {
      const layerData = clipboardRef.current.data as { name: string };
      addLayer('raster', `${layerData.name} (copy)`);
      console.log('Pasted layer');
    }
  }, [addLayer]);

  /**
   * Select all (create full canvas selection)
   */
  const handleSelectAll = useCallback(() => {
    // Create a rectangular path covering the entire canvas
    const path = new Path2D();
    path.rect(0, 0, canvasWidth, canvasHeight);
    setSelection(path);
  }, [canvasWidth, canvasHeight, setSelection]);

  /**
   * Deselect all
   */
  const handleDeselect = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Increase brush size
   */
  const increaseBrushSize = useCallback(() => {
    const newSize = Math.min(currentBrush.size + 5, 500);
    updateBrush({ size: newSize });
  }, [currentBrush.size, updateBrush]);

  /**
   * Decrease brush size
   */
  const decreaseBrushSize = useCallback(() => {
    const newSize = Math.max(currentBrush.size - 5, 1);
    updateBrush({ size: newSize });
  }, [currentBrush.size, updateBrush]);

  /**
   * Delete active layer
   */
  const handleDelete = useCallback(() => {
    if (activeLayerId && layers.length > 1) {
      removeLayer(activeLayerId);
    }
  }, [activeLayerId, layers.length, removeLayer]);

  /**
   * Reset default colors (black/white)
   */
  const resetColors = useCallback(() => {
    setPrimaryColor('#ffffff');
    setSecondaryColor('#000000');
  }, [setPrimaryColor, setSecondaryColor]);

  /**
   * Main keyboard event handler
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      // === FILE OPERATIONS ===
      // Ctrl+S = Save (handled in page component)
      // Ctrl+Shift+S = Save As
      // Ctrl+E = Export

      // === EDIT OPERATIONS ===
      // Ctrl+Z = Undo
      if (ctrl && !shift && key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y = Redo
      if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+C = Copy
      if (ctrl && key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl+X = Cut
      if (ctrl && key === 'x') {
        e.preventDefault();
        handleCut();
        return;
      }

      // Ctrl+V = Paste
      if (ctrl && key === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Ctrl+A = Select All
      if (ctrl && key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Ctrl+D = Deselect
      if (ctrl && key === 'd') {
        e.preventDefault();
        handleDeselect();
        return;
      }

      // Delete/Backspace = Delete layer
      if (key === 'delete' || key === 'backspace') {
        if (!ctrl && !shift) {
          e.preventDefault();
          handleDelete();
          return;
        }
      }

      // === ZOOM/PAN ===
      // Ctrl+0 = Fit to screen
      if (ctrl && key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan(0, 0);
        return;
      }

      // Ctrl+1 = 100% zoom
      if (ctrl && key === '1') {
        e.preventDefault();
        setZoom(1);
        return;
      }

      // + or = = Zoom in
      if (key === '=' || key === '+') {
        e.preventDefault();
        setZoom(zoom * 1.25);
        return;
      }

      // - = Zoom out
      if (key === '-' && !ctrl) {
        e.preventDefault();
        setZoom(zoom / 1.25);
        return;
      }

      // === TOOL SHORTCUTS (Photoshop-style) ===
      if (!ctrl && !alt) {
        switch (key) {
          // V = Move tool
          case 'v':
            e.preventDefault();
            setActiveTool('move');
            return;

          // M = Marquee selection (rectangle)
          case 'm':
            e.preventDefault();
            setActiveTool('selection-rect');
            return;

          // L = Lasso selection
          case 'l':
            e.preventDefault();
            setActiveTool('selection-lasso');
            return;

          // W = Magic wand
          case 'w':
            e.preventDefault();
            setActiveTool('selection-magic');
            return;

          // I = Eyedropper
          case 'i':
            e.preventDefault();
            setActiveTool('eyedropper');
            return;

          // B = Brush tool
          case 'b':
            e.preventDefault();
            setActiveTool('brush');
            return;

          // E = Eraser tool
          case 'e':
            e.preventDefault();
            setActiveTool('eraser');
            return;

          // G = Gradient/Paint bucket
          case 'g':
            e.preventDefault();
            setActiveTool(shift ? 'fill' : 'gradient');
            return;

          // S = Clone stamp
          case 's':
            e.preventDefault();
            setActiveTool('clone');
            return;

          // O = Dodge/Burn
          case 'o':
            e.preventDefault();
            setActiveTool(shift ? 'burn' : 'dodge');
            return;

          // P = Pen tool
          case 'p':
            e.preventDefault();
            setActiveTool('vector-pen');
            return;

          // T = Text tool
          case 't':
            e.preventDefault();
            setActiveTool('text');
            return;

          // U = Shape tool
          case 'u':
            e.preventDefault();
            setActiveTool('vector-shape');
            return;

          // H = Hand tool (pan)
          case 'h':
            e.preventDefault();
            setActiveTool('hand');
            return;

          // R = Blur tool (no rotate-view)
          case 'r':
            e.preventDefault();
            setActiveTool('blur');
            return;

          // Z = Zoom tool
          case 'z':
            e.preventDefault();
            setActiveTool('zoom');
            return;

          // X = Swap colors
          case 'x':
            e.preventDefault();
            swapColors();
            return;

          // D = Default colors (black/white)
          case 'd':
            e.preventDefault();
            resetColors();
            return;

          // [ = Decrease brush size
          case '[':
            e.preventDefault();
            decreaseBrushSize();
            return;

          // ] = Increase brush size
          case ']':
            e.preventDefault();
            increaseBrushSize();
            return;

          // Space = Temporary hand tool (handled separately)
          case ' ':
            // Don't prevent default here, handled in canvas
            return;
        }
      }

      // === LAYER SHORTCUTS ===
      // Ctrl+J = Duplicate layer
      if (ctrl && key === 'j') {
        e.preventDefault();
        if (activeLayerId) {
          duplicateLayer(activeLayerId);
        }
        return;
      }

      // Ctrl+Shift+N = New layer
      if (ctrl && shift && key === 'n') {
        e.preventDefault();
        addLayer('raster', `Layer ${layers.length + 1}`);
        return;
      }

      // Ctrl+] = Move layer up
      if (ctrl && key === ']') {
        e.preventDefault();
        if (activeLayerId) {
          moveLayer(activeLayerId, 'up');
        }
        return;
      }

      // Ctrl+[ = Move layer down
      if (ctrl && key === '[') {
        e.preventDefault();
        if (activeLayerId) {
          moveLayer(activeLayerId, 'down');
        }
        return;
      }

      // Alt+[ or Alt+] = Select prev/next layer
      if (alt && (key === '[' || key === ']')) {
        e.preventDefault();
        const currentIndex = layers.findIndex(l => l.id === activeLayerId);
        if (currentIndex !== -1) {
          const newIndex = key === '['
            ? Math.min(currentIndex + 1, layers.length - 1)
            : Math.max(currentIndex - 1, 0);
          setActiveLayer(layers[newIndex].id);
        }
        return;
      }

      // Ctrl+H = Toggle layer visibility
      if (ctrl && key === 'h') {
        e.preventDefault();
        if (activeLayerId) {
          toggleLayerVisibility(activeLayerId);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    zoom, setZoom, setPan, panX, panY,
    undo, redo,
    setActiveTool, activeTool,
    swapColors, resetColors,
    handleCopy, handleCut, handlePaste,
    handleSelectAll, handleDeselect, handleDelete,
    increaseBrushSize, decreaseBrushSize,
    activeLayerId, layers,
    duplicateLayer, addLayer, moveLayer,
    setActiveLayer, toggleLayerVisibility,
  ]);

  return {
    clipboard: clipboardRef.current,
    copy: handleCopy,
    cut: handleCut,
    paste: handlePaste,
    selectAll: handleSelectAll,
    deselect: handleDeselect,
  };
}

/**
 * Hook to handle space bar for temporary hand tool
 */
export function useSpaceBarPan() {
  const spacePressed = useRef(false);
  const originalTool = useRef<string | null>(null);
  const { activeTool, setActiveTool } = useStudioEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed.current) {
        spacePressed.current = true;
        originalTool.current = activeTool;
        setActiveTool('hand');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spacePressed.current) {
        spacePressed.current = false;
        if (originalTool.current) {
          setActiveTool(originalTool.current as never);
          originalTool.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, setActiveTool]);

  return spacePressed.current;
}
