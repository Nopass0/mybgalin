/**
 * Lenticular Editor Component
 *
 * Editor for creating lenticular/animated sticker effects.
 * Allows multiple frames that animate based on viewing angle.
 *
 * Features:
 * - Multi-frame timeline management
 * - Frame reordering and duplication
 * - Animation preview with playback controls
 * - Per-frame layer support
 * - Export to lenticular format
 *
 * @module components/studio/lenticular-editor
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Play, Pause, Copy, ChevronLeft, ChevronRight, Layers, Settings, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LenticularFrame, LenticularSettings, LenticularAnimationType, Layer } from '@/types/studio';

interface LenticularEditorProps {
  frames: LenticularFrame[];
  settings: LenticularSettings;
  currentLayers: Layer[];
  onFramesChange: (frames: LenticularFrame[]) => void;
  onSettingsChange: (settings: LenticularSettings) => void;
  onSelectFrame: (frame: LenticularFrame) => void;
  onCaptureFrame: () => string; // Returns base64 image data
  className?: string;
}

const ANIMATION_TYPES: { id: LenticularAnimationType; name: string; description: string }[] = [
  { id: 'flip', name: 'Flip', description: 'Switch between frames' },
  { id: 'morph', name: 'Morph', description: 'Smooth transition' },
  { id: 'zoom', name: 'Zoom', description: 'Zoom in/out effect' },
  { id: '3d-depth', name: '3D Depth', description: 'Parallax depth effect' },
  { id: 'animation', name: 'Animation', description: 'Frame-by-frame animation' },
  { id: 'custom', name: 'Custom', description: 'Custom transitions' },
];

const TRANSITION_TYPES = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] as const;
const LOOP_MODES = ['loop', 'ping-pong', 'once'] as const;

export function LenticularEditor({
  frames,
  settings,
  currentLayers,
  onFramesChange,
  onSettingsChange,
  onSelectFrame,
  onCaptureFrame,
  className,
}: LenticularEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const playDirectionRef = useRef<1 | -1>(1);

  // Generate unique ID
  const generateId = () => `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    const frameDuration = 1000 / settings.fps;
    if (timestamp - lastFrameTimeRef.current >= frameDuration) {
      setCurrentFrameIndex((prev) => {
        let next = prev + playDirectionRef.current;

        if (settings.loopMode === 'loop') {
          if (next >= frames.length) next = 0;
          if (next < 0) next = frames.length - 1;
        } else if (settings.loopMode === 'ping-pong') {
          if (next >= frames.length) {
            next = frames.length - 2;
            playDirectionRef.current = -1;
          } else if (next < 0) {
            next = 1;
            playDirectionRef.current = 1;
          }
        } else if (settings.loopMode === 'once') {
          if (next >= frames.length) {
            setIsPlaying(false);
            return prev;
          }
        }

        return Math.max(0, Math.min(frames.length - 1, next));
      });
      lastFrameTimeRef.current = timestamp;
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, frames.length, settings.fps, settings.loopMode]);

  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  const handleAddFrame = () => {
    const imageData = onCaptureFrame();
    const newFrame: LenticularFrame = {
      id: generateId(),
      index: frames.length,
      imageData,
      layers: JSON.parse(JSON.stringify(currentLayers)), // Deep copy
    };

    onFramesChange([...frames, newFrame]);
    setCurrentFrameIndex(frames.length);
  };

  const handleDuplicateFrame = (index: number) => {
    const frame = frames[index];
    const newFrame: LenticularFrame = {
      ...frame,
      id: generateId(),
      index: frames.length,
      layers: JSON.parse(JSON.stringify(frame.layers)),
    };

    const newFrames = [...frames];
    newFrames.splice(index + 1, 0, newFrame);

    // Update indices
    newFrames.forEach((f, i) => (f.index = i));
    onFramesChange(newFrames);
  };

  const handleDeleteFrame = (index: number) => {
    if (frames.length <= 1) return;

    const newFrames = frames.filter((_, i) => i !== index);
    newFrames.forEach((f, i) => (f.index = i));

    onFramesChange(newFrames);
    if (currentFrameIndex >= newFrames.length) {
      setCurrentFrameIndex(newFrames.length - 1);
    }
  };

  const handleSelectFrame = (index: number) => {
    setCurrentFrameIndex(index);
    onSelectFrame(frames[index]);
  };

  const handleMoveFrame = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= frames.length) return;

    const newFrames = [...frames];
    const [moved] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, moved);

    newFrames.forEach((f, i) => (f.index = i));
    onFramesChange(newFrames);
    setCurrentFrameIndex(toIndex);
  };

  const handleUpdateFrameImage = (index: number) => {
    const imageData = onCaptureFrame();
    const newFrames = [...frames];
    newFrames[index] = {
      ...newFrames[index],
      imageData,
      layers: JSON.parse(JSON.stringify(currentLayers)),
    };
    onFramesChange(newFrames);
  };

  const togglePlayback = () => {
    playDirectionRef.current = 1;
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={cn('bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-800 flex flex-col', className)}>
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Lenticular Editor</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn('p-1 rounded transition-colors', showSettings ? 'bg-orange-600/20' : 'hover:bg-zinc-700')}
        >
          <Settings className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-3 border-b border-zinc-800 space-y-3 bg-zinc-800/50">
          {/* Animation Type */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Animation Type</label>
            <select
              value={settings.animationType}
              onChange={(e) =>
                onSettingsChange({ ...settings, animationType: e.target.value as LenticularAnimationType })
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
            >
              {ANIMATION_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transition Type */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Transition</label>
            <select
              value={settings.transitionType}
              onChange={(e) =>
                onSettingsChange({ ...settings, transitionType: e.target.value as (typeof TRANSITION_TYPES)[number] })
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
            >
              {TRANSITION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Loop Mode */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Loop Mode</label>
            <select
              value={settings.loopMode}
              onChange={(e) =>
                onSettingsChange({ ...settings, loopMode: e.target.value as (typeof LOOP_MODES)[number] })
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
            >
              {LOOP_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* FPS */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400">FPS</label>
              <span className="text-xs text-zinc-500">{settings.fps}</span>
            </div>
            <input
              type="range"
              value={settings.fps}
              min={1}
              max={60}
              onChange={(e) => onSettingsChange({ ...settings, fps: parseInt(e.target.value) })}
              className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* Frame Count */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400">Target Frame Count</label>
              <span className="text-xs text-zinc-500">{settings.frameCount}</span>
            </div>
            <input
              type="range"
              value={settings.frameCount}
              min={2}
              max={30}
              onChange={(e) => onSettingsChange({ ...settings, frameCount: parseInt(e.target.value) })}
              className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="p-3 border-b border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Preview</div>
        <div
          ref={previewRef}
          className="aspect-square bg-zinc-800 rounded overflow-hidden relative"
        >
          {frames.length > 0 && frames[currentFrameIndex] ? (
            <img
              src={frames[currentFrameIndex].imageData}
              alt={`Frame ${currentFrameIndex + 1}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
              No frames
            </div>
          )}

          {/* Frame indicator */}
          {frames.length > 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded text-xs text-zinc-300">
              {currentFrameIndex + 1} / {frames.length}
            </div>
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            onClick={() => setCurrentFrameIndex((prev) => Math.max(0, prev - 1))}
            disabled={frames.length === 0}
            className="p-2 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlayback}
            disabled={frames.length < 2}
            className={cn(
              'p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              isPlaying ? 'bg-orange-600 hover:bg-orange-500' : 'hover:bg-zinc-700'
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setCurrentFrameIndex((prev) => Math.min(frames.length - 1, prev + 1))}
            disabled={frames.length === 0}
            className="p-2 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Frame list */}
      <div className="flex-1 overflow-auto p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">Frames ({frames.length}/{settings.frameCount})</span>
          <button
            onClick={handleAddFrame}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
            title="Capture current canvas as new frame"
          >
            <Plus className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-1">
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded transition-colors cursor-pointer',
                currentFrameIndex === index ? 'bg-orange-600/20 border border-orange-600/50' : 'hover:bg-zinc-800'
              )}
              onClick={() => handleSelectFrame(index)}
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 bg-zinc-700 rounded overflow-hidden flex-shrink-0">
                <img
                  src={frame.imageData}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-300">Frame {index + 1}</div>
                <div className="text-[10px] text-zinc-500">{frame.layers.length} layers</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveFrame(index, index - 1);
                  }}
                  disabled={index === 0}
                  className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveFrame(index, index + 1);
                  }}
                  disabled={index === frames.length - 1}
                  className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateFrameImage(index);
                  }}
                  className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  title="Update with current canvas"
                >
                  <Image className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateFrame(index);
                  }}
                  className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  title="Duplicate frame"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFrame(index);
                  }}
                  disabled={frames.length <= 1}
                  className="p-1 hover:bg-red-600/20 rounded disabled:opacity-30 transition-colors"
                  title="Delete frame"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {frames.length === 0 && (
          <div className="text-center py-8 text-xs text-zinc-500">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No frames yet</p>
            <p className="text-zinc-600 mt-1">Click + to capture the current canvas</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-3 border-t border-zinc-800">
        <div className="text-[10px] text-zinc-600 space-y-1">
          <p>• Create frames by capturing the canvas</p>
          <p>• Edit layers, then update frame image</p>
          <p>• Preview animation with playback controls</p>
        </div>
      </div>
    </div>
  );
}
