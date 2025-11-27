'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  children?: ContextMenuItem[];
  onClick?: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
  className?: string;
}

export function ContextMenu({ items, x, y, onClose, className = '' }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [submenu, setSubmenu] = useState<{ items: ContextMenuItem[]; x: number; y: number } | null>(null);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = Math.min(x, window.innerWidth - rect.width - 10);
      const newY = Math.min(y, window.innerHeight - rect.height - 10);
      setPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    }
  }, [x, y]);

  // Close on click outside or escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
      onClose();
    }
  };

  const handleMouseEnter = (item: ContextMenuItem, e: React.MouseEvent) => {
    if (item.children && item.children.length > 0) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setSubmenu({
        items: item.children,
        x: rect.right,
        y: rect.top,
      });
    } else {
      setSubmenu(null);
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-[100] min-w-[180px] bg-[#2d2d2f] border border-[#3a3a3c] rounded-lg shadow-2xl py-1 ${className}`}
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => (
        item.separator ? (
          <div key={`sep-${index}`} className="h-px bg-[#3a3a3c] my-1 mx-2" />
        ) : (
          <div
            key={item.id}
            className={`px-3 py-1.5 flex items-center gap-3 cursor-pointer transition-colors ${
              item.disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-[#3a3a3c]'
            }`}
            onClick={() => handleItemClick(item)}
            onMouseEnter={(e) => handleMouseEnter(item, e)}
          >
            {item.icon && (
              <span className="w-4 h-4 flex items-center justify-center text-white/70">
                {item.icon}
              </span>
            )}
            <span className="flex-1 text-sm text-white/90">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-white/40 ml-4">{item.shortcut}</span>
            )}
            {item.children && item.children.length > 0 && (
              <svg className="w-3 h-3 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        )
      ))}

      {/* Submenu */}
      {submenu && (
        <ContextMenu
          items={submenu.items}
          x={submenu.x}
          y={submenu.y}
          onClose={onClose}
        />
      )}
    </div>,
    document.body
  );
}

// Brush context menu near cursor
interface BrushContextMenuProps {
  x: number;
  y: number;
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  primaryColor: string;
  secondaryColor: string;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  onBrushHardnessChange: (hardness: number) => void;
  onPrimaryColorChange: (color: string) => void;
  onSecondaryColorChange: (color: string) => void;
  onClose: () => void;
}

export function BrushContextMenu({
  x, y,
  brushSize, brushOpacity, brushHardness,
  primaryColor, secondaryColor,
  onBrushSizeChange, onBrushOpacityChange, onBrushHardnessChange,
  onPrimaryColorChange, onSecondaryColorChange,
  onClose,
}: BrushContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = Math.min(x, window.innerWidth - rect.width - 10);
      const newY = Math.min(y, window.innerHeight - rect.height - 10);
      setPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] w-[220px] bg-[#2d2d2f] border border-[#3a3a3c] rounded-lg shadow-2xl p-3"
      style={{ left: position.x, top: position.y }}
    >
      {/* Color swatches */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative w-10 h-10">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => onPrimaryColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-8 h-8 rounded border-2 border-white shadow-md absolute top-0 left-0"
            style={{ backgroundColor: primaryColor }}
          />
          <input
            type="color"
            value={secondaryColor}
            onChange={(e) => onSecondaryColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ top: 8, left: 8 }}
          />
          <div
            className="w-8 h-8 rounded border border-white/50 absolute bottom-0 right-0"
            style={{ backgroundColor: secondaryColor }}
          />
        </div>
        <div className="flex-1 text-xs text-white/60">
          <div>Primary: {primaryColor}</div>
          <div>Secondary: {secondaryColor}</div>
        </div>
      </div>

      {/* Size slider */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Size</span>
          <span>{brushSize}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="500"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
          className="w-full h-1 bg-[#3a3a3c] rounded appearance-none cursor-pointer accent-orange-500"
        />
      </div>

      {/* Opacity slider */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Opacity</span>
          <span>{brushOpacity}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={brushOpacity}
          onChange={(e) => onBrushOpacityChange(parseInt(e.target.value))}
          className="w-full h-1 bg-[#3a3a3c] rounded appearance-none cursor-pointer accent-orange-500"
        />
      </div>

      {/* Hardness slider */}
      <div>
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Hardness</span>
          <span>{brushHardness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={brushHardness}
          onChange={(e) => onBrushHardnessChange(parseInt(e.target.value))}
          className="w-full h-1 bg-[#3a3a3c] rounded appearance-none cursor-pointer accent-orange-500"
        />
      </div>

      {/* Quick brush presets */}
      <div className="mt-3 pt-3 border-t border-[#3a3a3c]">
        <div className="text-xs text-white/60 mb-2">Quick Presets</div>
        <div className="flex gap-1">
          {[5, 10, 25, 50, 100, 200].map((size) => (
            <button
              key={size}
              onClick={() => onBrushSizeChange(size)}
              className={`flex-1 py-1 text-xs rounded transition-colors ${
                brushSize === size ? 'bg-orange-500 text-white' : 'bg-[#3a3a3c] text-white/70 hover:bg-[#4a4a4c]'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Text tool context menu
interface TextContextMenuProps {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  onFontSizeChange: (size: number) => void;
  onFontFamilyChange: (family: string) => void;
  onFontWeightChange: (weight: number) => void;
  onTextColorChange: (color: string) => void;
  onClose: () => void;
}

export function TextContextMenu({
  x, y,
  fontSize, fontFamily, fontWeight, textColor,
  onFontSizeChange, onFontFamilyChange, onFontWeightChange, onTextColorChange,
  onClose,
}: TextContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = Math.min(x, window.innerWidth - rect.width - 10);
      const newY = Math.min(y, window.innerHeight - rect.height - 10);
      setPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Roboto', 'Open Sans', 'Montserrat', 'Impact', 'Comic Sans MS'
  ];

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] w-[240px] bg-[#2d2d2f] border border-[#3a3a3c] rounded-lg shadow-2xl p-3"
      style={{ left: position.x, top: position.y }}
    >
      {/* Font family */}
      <div className="mb-3">
        <div className="text-xs text-white/60 mb-1">Font Family</div>
        <select
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          className="w-full bg-[#3a3a3c] text-white text-sm rounded px-2 py-1.5 border border-[#4a4a4c]"
        >
          {fonts.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Font size */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Font Size</span>
          <span>{fontSize}px</span>
        </div>
        <input
          type="range"
          min="8"
          max="200"
          value={fontSize}
          onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
          className="w-full h-1 bg-[#3a3a3c] rounded appearance-none cursor-pointer accent-orange-500"
        />
      </div>

      {/* Font weight */}
      <div className="mb-3">
        <div className="text-xs text-white/60 mb-1">Font Weight</div>
        <div className="flex gap-1">
          {[300, 400, 500, 600, 700, 900].map((weight) => (
            <button
              key={weight}
              onClick={() => onFontWeightChange(weight)}
              className={`flex-1 py-1 text-xs rounded transition-colors ${
                fontWeight === weight ? 'bg-orange-500 text-white' : 'bg-[#3a3a3c] text-white/70 hover:bg-[#4a4a4c]'
              }`}
            >
              {weight === 300 ? 'L' : weight === 400 ? 'R' : weight === 500 ? 'M' : weight === 600 ? 'SB' : weight === 700 ? 'B' : 'XB'}
            </button>
          ))}
        </div>
      </div>

      {/* Text color */}
      <div>
        <div className="text-xs text-white/60 mb-1">Text Color</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={textColor}
            onChange={(e) => onTextColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <input
            type="text"
            value={textColor}
            onChange={(e) => onTextColorChange(e.target.value)}
            className="flex-1 bg-[#3a3a3c] text-white text-sm rounded px-2 py-1 border border-[#4a4a4c]"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// Tool submenu for tools with variants
interface ToolSubMenuProps {
  x: number;
  y: number;
  tools: Array<{
    id: string;
    name: string;
    icon: React.ReactNode;
  }>;
  activeTool: string;
  onSelectTool: (toolId: string) => void;
  onClose: () => void;
}

export function ToolSubMenu({ x, y, tools, activeTool, onSelectTool, onClose }: ToolSubMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = Math.min(x, window.innerWidth - rect.width - 10);
      const newY = Math.min(y, window.innerHeight - rect.height - 10);
      setPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] bg-[#2d2d2f] border border-[#3a3a3c] rounded-lg shadow-2xl p-2"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              onSelectTool(tool.id);
              onClose();
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              activeTool === tool.id
                ? 'bg-orange-500 text-white'
                : 'hover:bg-[#3a3a3c] text-white/80'
            }`}
          >
            <span className="w-5 h-5">{tool.icon}</span>
            <span className="text-sm">{tool.name}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

// Filter context menu for blur/sharpen/smudge tools
interface FilterContextMenuProps {
  x: number;
  y: number;
  strength: number;
  brushSize: number;
  onStrengthChange: (strength: number) => void;
  onBrushSizeChange: (size: number) => void;
  onClose: () => void;
  toolName: string;
}

export function FilterContextMenu({
  x, y,
  strength, brushSize,
  onStrengthChange, onBrushSizeChange,
  onClose,
  toolName,
}: FilterContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = Math.min(x, window.innerWidth - rect.width - 10);
      const newY = Math.min(y, window.innerHeight - rect.height - 10);
      setPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] w-[200px] bg-[#2d2d2f] border border-[#3a3a3c] rounded-lg shadow-2xl p-3"
      style={{ left: position.x, top: position.y }}
    >
      <div className="text-sm text-white/80 font-medium mb-3 capitalize">{toolName} Settings</div>

      {/* Size slider */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Size</span>
          <span>{brushSize}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="200"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
          className="w-full h-1 bg-[#3a3a3c] rounded appearance-none cursor-pointer accent-orange-500"
        />
      </div>

      {/* Strength slider */}
      <div>
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Strength</span>
          <span>{strength}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={strength}
          onChange={(e) => onStrengthChange(parseInt(e.target.value))}
          className="w-full h-1 bg-[#3a3a3c] rounded appearance-none cursor-pointer accent-orange-500"
        />
      </div>
    </div>,
    document.body
  );
}
