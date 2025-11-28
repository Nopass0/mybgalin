/**
 * Text Tool Panel Component
 *
 * Typography controls for text layers in the CS2 Skin Studio.
 * Provides comprehensive text formatting options.
 *
 * Features:
 * - Google Fonts integration with 50+ popular fonts
 * - Font size, weight, and style controls
 * - Text alignment (left, center, right, justify)
 * - Letter spacing and line height
 * - Text effects (shadow, outline, glow)
 * - Real-time preview with font loading
 *
 * @module components/studio/text-tool-panel
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Search,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { GoogleFont, TextLayerContent, TextWarp } from '@/types/studio';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Popular Google Fonts preloaded - organized by category
const POPULAR_FONTS: GoogleFont[] = [
  // Sans-serif - Modern & Clean
  { family: 'Roboto', variants: ['100', '300', '400', '500', '700', '900'], category: 'sans-serif' },
  { family: 'Open Sans', variants: ['300', '400', '500', '600', '700', '800'], category: 'sans-serif' },
  { family: 'Lato', variants: ['100', '300', '400', '700', '900'], category: 'sans-serif' },
  { family: 'Montserrat', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'sans-serif' },
  { family: 'Oswald', variants: ['200', '300', '400', '500', '600', '700'], category: 'sans-serif' },
  { family: 'Poppins', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'sans-serif' },
  { family: 'Raleway', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'sans-serif' },
  { family: 'Inter', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'sans-serif' },
  { family: 'Nunito', variants: ['200', '300', '400', '500', '600', '700', '800', '900'], category: 'sans-serif' },
  { family: 'Work Sans', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'sans-serif' },
  // Serif - Elegant
  { family: 'Playfair Display', variants: ['400', '500', '600', '700', '800', '900'], category: 'serif' },
  { family: 'Merriweather', variants: ['300', '400', '700', '900'], category: 'serif' },
  { family: 'Lora', variants: ['400', '500', '600', '700'], category: 'serif' },
  { family: 'Crimson Text', variants: ['400', '600', '700'], category: 'serif' },
  // Monospace - Tech
  { family: 'Source Code Pro', variants: ['200', '300', '400', '500', '600', '700', '900'], category: 'monospace' },
  { family: 'Fira Code', variants: ['300', '400', '500', '600', '700'], category: 'monospace' },
  { family: 'JetBrains Mono', variants: ['100', '200', '300', '400', '500', '600', '700', '800'], category: 'monospace' },
  { family: 'Roboto Mono', variants: ['100', '200', '300', '400', '500', '600', '700'], category: 'monospace' },
  // Display - Impact/Gaming Style (Great for CS2 skins!)
  { family: 'Bebas Neue', variants: ['400'], category: 'display' },
  { family: 'Anton', variants: ['400'], category: 'display' },
  { family: 'Russo One', variants: ['400'], category: 'display' },
  { family: 'Bungee', variants: ['400'], category: 'display' },
  { family: 'Teko', variants: ['300', '400', '500', '600', '700'], category: 'display' },
  { family: 'Black Ops One', variants: ['400'], category: 'display' },
  { family: 'Orbitron', variants: ['400', '500', '600', '700', '800', '900'], category: 'display' },
  { family: 'Righteous', variants: ['400'], category: 'display' },
  { family: 'Audiowide', variants: ['400'], category: 'display' },
  { family: 'Press Start 2P', variants: ['400'], category: 'display' },
  { family: 'Lobster', variants: ['400'], category: 'display' },
  { family: 'Bangers', variants: ['400'], category: 'display' },
  { family: 'Alfa Slab One', variants: ['400'], category: 'display' },
  { family: 'Rubik Mono One', variants: ['400'], category: 'display' },
  { family: 'Graduate', variants: ['400'], category: 'display' },
  { family: 'Special Elite', variants: ['400'], category: 'display' },
  { family: 'Staatliches', variants: ['400'], category: 'display' },
  // Handwriting - Artistic
  { family: 'Permanent Marker', variants: ['400'], category: 'handwriting' },
  { family: 'Dancing Script', variants: ['400', '500', '600', '700'], category: 'handwriting' },
  { family: 'Pacifico', variants: ['400'], category: 'handwriting' },
  { family: 'Caveat', variants: ['400', '500', '600', '700'], category: 'handwriting' },
  { family: 'Shadows Into Light', variants: ['400'], category: 'handwriting' },
  { family: 'Kaushan Script', variants: ['400'], category: 'handwriting' },
  { family: 'Rock Salt', variants: ['400'], category: 'handwriting' },
];

const TEXT_WARPS: { value: TextWarp['type']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'arc', label: 'Arc' },
  { value: 'arch', label: 'Arch' },
  { value: 'bulge', label: 'Bulge' },
  { value: 'flag', label: 'Flag' },
  { value: 'wave', label: 'Wave' },
  { value: 'fish', label: 'Fish' },
  { value: 'rise', label: 'Rise' },
  { value: 'fisheye', label: 'Fisheye' },
  { value: 'inflate', label: 'Inflate' },
  { value: 'squeeze', label: 'Squeeze' },
  { value: 'twist', label: 'Twist' },
];

interface TextToolPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function TextToolPanel({ isOpen = true, onClose, className }: TextToolPanelProps) {
  const {
    layers,
    activeLayerId,
    updateLayer,
    addLayer,
    primaryColor,
    pushHistory
  } = useStudioEditor();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [isLoadingFont, setIsLoadingFont] = useState(false);

  const activeLayer = layers.find(l => l.id === activeLayerId);
  const isTextLayer = activeLayer?.type === 'text';
  const textContent = activeLayer?.textContent;

  // Load Google Font dynamically
  const loadFont = useCallback(async (fontFamily: string) => {
    if (loadedFonts.has(fontFamily)) return;

    setIsLoadingFont(true);
    try {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Wait for font to load
      await document.fonts.load(`16px "${fontFamily}"`);
      setLoadedFonts(prev => new Set([...prev, fontFamily]));
    } catch (error) {
      console.error('Failed to load font:', error);
    } finally {
      setIsLoadingFont(false);
    }
  }, [loadedFonts]);

  // Load default fonts on mount
  useEffect(() => {
    const loadDefaultFonts = async () => {
      const defaultFonts = POPULAR_FONTS.slice(0, 5);
      await Promise.allSettled(defaultFonts.map(font => loadFont(font.family)));
    };
    loadDefaultFonts();
  }, [loadFont]);

  const updateTextContent = (updates: Partial<TextLayerContent>) => {
    if (!activeLayerId || !isTextLayer) return;

    const newTextContent = {
      ...textContent,
      ...updates,
    } as TextLayerContent;

    updateLayer(activeLayerId, { textContent: newTextContent });
    pushHistory('Update text');
  };

  const createTextLayer = () => {
    const layer = addLayer('text', 'Text Layer');
    // Center the text on the canvas (assuming 1024x1024 canvas)
    // x, y represent top-left corner, so calculate based on text dimensions
    const textWidth = 500;
    const textHeight = 120;
    const centerX = 512;
    const centerY = 512;

    updateLayer(layer.id, {
      textContent: {
        text: 'Double-click to edit',
        fontFamily: 'Inter',
        fontSize: 48,
        fontWeight: 400,
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 0,
        color: primaryColor,
      },
      transform: {
        x: centerX - textWidth / 2,  // Top-left x position
        y: centerY - textHeight / 2, // Top-left y position
        width: textWidth,
        height: textHeight,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
      },
    });
    pushHistory('Add text layer');
  };

  const filteredFonts = POPULAR_FONTS.filter(font => {
    const matchesSearch = font.family.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || font.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(POPULAR_FONTS.map(f => f.category)))];

  if (!isOpen) return null;

  return (
    <div className={cn('bg-[#121214] overflow-hidden flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-white">Text Tool</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={createTextLayer}
          className="h-7 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
        >
          Add Text
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {isTextLayer && textContent ? (
            <>
              {/* Text Content */}
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Text</label>
                <textarea
                  value={textContent.text}
                  onChange={(e) => updateTextContent({ text: e.target.value })}
                  placeholder="Enter your text..."
                  className="w-full h-20 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  style={{ fontFamily: loadedFonts.has(textContent.fontFamily) ? textContent.fontFamily : 'inherit' }}
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Font Family</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-white/5 border-white/10 text-white"
                    >
                      <span style={{ fontFamily: textContent.fontFamily }}>
                        {textContent.fontFamily}
                      </span>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-[#1a1a1c] border-white/10">
                    <div className="p-2 border-b border-white/10 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search fonts..."
                          className="pl-8 bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      {/* Category filter */}
                      <div className="flex flex-wrap gap-1">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={cn(
                              'px-2 py-0.5 text-[10px] rounded transition-colors capitalize',
                              categoryFilter === cat
                                ? 'bg-orange-500/30 text-orange-300'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="p-1">
                        {filteredFonts.map((font) => (
                          <button
                            key={font.family}
                            onClick={() => {
                              loadFont(font.family);
                              updateTextContent({ fontFamily: font.family });
                            }}
                            onMouseEnter={() => loadFont(font.family)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors',
                              textContent.fontFamily === font.family
                                ? 'bg-orange-500/20'
                                : 'hover:bg-white/5'
                            )}
                          >
                            <span
                              className="text-white text-sm truncate max-w-[180px]"
                              style={{ fontFamily: loadedFonts.has(font.family) ? font.family : 'inherit' }}
                            >
                              {font.family}
                            </span>
                            <span className="text-[10px] text-white/30 capitalize shrink-0 ml-2">
                              {font.category}
                            </span>
                          </button>
                        ))}
                        {filteredFonts.length === 0 && (
                          <div className="text-center py-4 text-white/40 text-sm">
                            No fonts found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                {isLoadingFont && (
                  <div className="flex items-center gap-2 text-[10px] text-white/40">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading font...
                  </div>
                )}
              </div>

              {/* Font Size & Weight */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40">Size</label>
                  <Input
                    type="number"
                    value={textContent.fontSize}
                    onChange={(e) => updateTextContent({ fontSize: Number(e.target.value) })}
                    className="h-8 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40">Weight</label>
                  <Select
                    value={String(textContent.fontWeight)}
                    onValueChange={(v) => updateTextContent({ fontWeight: Number(v) })}
                  >
                    <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1c] border-white/10">
                      {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                        <SelectItem key={w} value={String(w)} className="text-white">
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Style Toggles */}
              <div className="flex items-center gap-1">
                <Button
                  variant={textContent.fontStyle === 'italic' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => updateTextContent({
                    fontStyle: textContent.fontStyle === 'italic' ? 'normal' : 'italic'
                  })}
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <div className="flex-1" />
                <Button
                  variant={textContent.textAlign === 'left' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => updateTextContent({ textAlign: 'left' })}
                >
                  <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant={textContent.textAlign === 'center' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => updateTextContent({ textAlign: 'center' })}
                >
                  <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                  variant={textContent.textAlign === 'right' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => updateTextContent({ textAlign: 'right' })}
                >
                  <AlignRight className="w-4 h-4" />
                </Button>
                <Button
                  variant={textContent.textAlign === 'justify' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => updateTextContent({ textAlign: 'justify' })}
                >
                  <AlignJustify className="w-4 h-4" />
                </Button>
              </div>

              {/* Line Height */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Line Height</span>
                  <span className="text-[10px] text-white/60">{textContent.lineHeight.toFixed(2)}</span>
                </div>
                <Slider
                  value={[textContent.lineHeight]}
                  onValueChange={([v]) => updateTextContent({ lineHeight: v })}
                  min={0.5}
                  max={3}
                  step={0.05}
                />
              </div>

              {/* Letter Spacing */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Letter Spacing</span>
                  <span className="text-[10px] text-white/60">{textContent.letterSpacing}px</span>
                </div>
                <Slider
                  value={[textContent.letterSpacing]}
                  onValueChange={([v]) => updateTextContent({ letterSpacing: v })}
                  min={-20}
                  max={50}
                  step={1}
                />
              </div>

              {/* Stroke */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Stroke</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px]"
                    onClick={() => updateTextContent({
                      stroke: textContent.stroke ? undefined : { color: '#000000', width: 2 }
                    })}
                  >
                    {textContent.stroke ? 'Remove' : 'Add'}
                  </Button>
                </div>
                {textContent.stroke && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40">Color</label>
                      <Input
                        type="color"
                        value={textContent.stroke.color}
                        onChange={(e) => updateTextContent({
                          stroke: { ...textContent.stroke!, color: e.target.value }
                        })}
                        className="h-8 p-1 bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40">Width</label>
                      <Input
                        type="number"
                        value={textContent.stroke.width}
                        onChange={(e) => updateTextContent({
                          stroke: { ...textContent.stroke!, width: Number(e.target.value) }
                        })}
                        className="h-8 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Shadow */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Shadow</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px]"
                    onClick={() => updateTextContent({
                      shadow: textContent.shadow ? undefined : {
                        color: '#000000',
                        offsetX: 2,
                        offsetY: 2,
                        blur: 4
                      }
                    })}
                  >
                    {textContent.shadow ? 'Remove' : 'Add'}
                  </Button>
                </div>
                {textContent.shadow && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40">X Offset</label>
                        <Input
                          type="number"
                          value={textContent.shadow.offsetX}
                          onChange={(e) => updateTextContent({
                            shadow: { ...textContent.shadow!, offsetX: Number(e.target.value) }
                          })}
                          className="h-7 bg-white/5 border-white/10 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40">Y Offset</label>
                        <Input
                          type="number"
                          value={textContent.shadow.offsetY}
                          onChange={(e) => updateTextContent({
                            shadow: { ...textContent.shadow!, offsetY: Number(e.target.value) }
                          })}
                          className="h-7 bg-white/5 border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40">Blur</span>
                        <span className="text-[10px] text-white/60">{textContent.shadow.blur}px</span>
                      </div>
                      <Slider
                        value={[textContent.shadow.blur]}
                        onValueChange={([v]) => updateTextContent({
                          shadow: { ...textContent.shadow!, blur: v }
                        })}
                        min={0}
                        max={50}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Warp */}
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Text Warp</label>
                <Select
                  value={textContent.warp?.type || 'none'}
                  onValueChange={(v) => updateTextContent({
                    warp: v === 'none' ? undefined : {
                      type: v as TextWarp['type'],
                      bend: 50,
                      horizontalDistortion: 0,
                      verticalDistortion: 0
                    }
                  })}
                >
                  <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-white/10">
                    {TEXT_WARPS.map((warp) => (
                      <SelectItem key={warp.value} value={warp.value} className="text-white">
                        {warp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {textContent.warp && textContent.warp.type !== 'none' && (
                  <div className="space-y-2 pt-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40">Bend</span>
                        <span className="text-[10px] text-white/60">{textContent.warp.bend}%</span>
                      </div>
                      <Slider
                        value={[textContent.warp.bend]}
                        onValueChange={([v]) => updateTextContent({
                          warp: { ...textContent.warp!, bend: v }
                        })}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40">H Distortion</span>
                        <span className="text-[10px] text-white/60">{textContent.warp.horizontalDistortion}%</span>
                      </div>
                      <Slider
                        value={[textContent.warp.horizontalDistortion]}
                        onValueChange={([v]) => updateTextContent({
                          warp: { ...textContent.warp!, horizontalDistortion: v }
                        })}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40">V Distortion</span>
                        <span className="text-[10px] text-white/60">{textContent.warp.verticalDistortion}%</span>
                      </div>
                      <Slider
                        value={[textContent.warp.verticalDistortion]}
                        onValueChange={([v]) => updateTextContent({
                          warp: { ...textContent.warp!, verticalDistortion: v }
                        })}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Type className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-sm text-white/40 mb-4">
                Select a text layer or create a new one
              </p>
              <Button
                onClick={createTextLayer}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Create Text Layer
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
