'use client';

import { motion } from 'motion/react';
import {
  MousePointer2,
  Move,
  Brush,
  Eraser,
  Square,
  Circle,
  Lasso,
  Wand2,
  PaintBucket,
  Blend,
  PenTool,
  Shapes,
  Pipette,
  ZoomIn,
  Hand,
  Spline,
  Maximize2,
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { ToolType } from '@/types/studio';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Tool {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  subTools?: { id: ToolType; icon: React.ReactNode; label: string }[];
}

const tools: Tool[] = [
  {
    id: 'move',
    icon: <Move className="w-4 h-4" />,
    label: 'Move Tool',
    shortcut: 'V',
  },
  {
    id: 'selection-rect',
    icon: <Square className="w-4 h-4" />,
    label: 'Selection',
    shortcut: 'M',
    subTools: [
      { id: 'selection-rect', icon: <Square className="w-4 h-4" />, label: 'Rectangle Select' },
      { id: 'selection-lasso', icon: <Lasso className="w-4 h-4" />, label: 'Lasso Select' },
      { id: 'selection-magic', icon: <Wand2 className="w-4 h-4" />, label: 'Magic Wand' },
    ],
  },
  {
    id: 'brush',
    icon: <Brush className="w-4 h-4" />,
    label: 'Brush Tool',
    shortcut: 'B',
  },
  {
    id: 'eraser',
    icon: <Eraser className="w-4 h-4" />,
    label: 'Eraser Tool',
    shortcut: 'E',
  },
  {
    id: 'fill',
    icon: <PaintBucket className="w-4 h-4" />,
    label: 'Fill Tool',
    shortcut: 'G',
  },
  {
    id: 'gradient',
    icon: <Blend className="w-4 h-4" />,
    label: 'Gradient Tool',
    shortcut: 'G',
  },
  {
    id: 'vector-pen',
    icon: <PenTool className="w-4 h-4" />,
    label: 'Pen Tool',
    shortcut: 'P',
    subTools: [
      { id: 'vector-pen', icon: <PenTool className="w-4 h-4" />, label: 'Pen Tool' },
      { id: 'vector-shape', icon: <Shapes className="w-4 h-4" />, label: 'Shape Tool' },
    ],
  },
  {
    id: 'eyedropper',
    icon: <Pipette className="w-4 h-4" />,
    label: 'Eyedropper',
    shortcut: 'I',
  },
  {
    id: 'zoom',
    icon: <ZoomIn className="w-4 h-4" />,
    label: 'Zoom Tool',
    shortcut: 'Z',
  },
  {
    id: 'hand',
    icon: <Hand className="w-4 h-4" />,
    label: 'Hand Tool',
    shortcut: 'H',
  },
  {
    id: 'warp',
    icon: <Spline className="w-4 h-4" />,
    label: 'Warp/Deform',
    shortcut: 'W',
    subTools: [
      { id: 'warp', icon: <Spline className="w-4 h-4" />, label: 'Warp Tool' },
      { id: 'perspective', icon: <Maximize2 className="w-4 h-4" />, label: 'Perspective Tool' },
    ],
  },
];

export function StudioToolbar() {
  const { activeTool, setActiveTool, primaryColor, secondaryColor, swapColors } = useStudioEditor();

  // Keyboard shortcuts
  if (typeof window !== 'undefined') {
    // Using useEffect would be better but keeping it simple
  }

  return (
    <div className="w-12 border-r border-white/10 bg-[#121214] flex flex-col items-center py-2 gap-0.5 shrink-0">
      {tools.map((tool) => (
        <Tooltip key={tool.id} delayDuration={300}>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setActiveTool(tool.id)}
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                activeTool === tool.id || tool.subTools?.some((s) => s.id === activeTool)
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {tool.icon}
              {tool.subTools && (
                <div className="absolute bottom-0.5 right-0.5 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-white/40" />
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span>{tool.label}</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded">
              {tool.shortcut}
            </kbd>
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Separator */}
      <div className="w-6 h-px bg-white/10 my-2" />

      {/* Color Swatches */}
      <div className="relative w-9 h-9">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="absolute top-0 left-0 w-6 h-6 rounded border-2 border-[#121214] shadow-sm z-10"
              style={{ backgroundColor: primaryColor }}
              onClick={() => {/* Open color picker */}}
            />
          </TooltipTrigger>
          <TooltipContent side="right">Foreground Color</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="absolute bottom-0 right-0 w-6 h-6 rounded border-2 border-[#121214] shadow-sm"
              style={{ backgroundColor: secondaryColor }}
              onClick={() => {/* Open color picker */}}
            />
          </TooltipTrigger>
          <TooltipContent side="right">Background Color</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="absolute top-0 right-0 w-3 h-3 flex items-center justify-center text-[8px] text-white/60 hover:text-white"
              onClick={swapColors}
            >
              ⇄
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Swap Colors (X)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
