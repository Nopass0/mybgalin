'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus,
  Play,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  GitBranch,
  Layers,
  Settings,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SmartMaterial, MaterialNode } from '@/types/studio';

interface MaterialsPanelProps {
  materials: SmartMaterial[];
  activeMaterialId: string | null;
  onSelectMaterial: (id: string) => void;
  onCreateMaterial: () => void;
  onDuplicateMaterial: (id: string) => void;
  onDeleteMaterial: (id: string) => void;
  onUpdateMaterial: (material: SmartMaterial) => void;
  onOpenFullEditor: (id: string) => void;
  className?: string;
}

/**
 * Simple node preview thumbnail
 */
function MaterialPreview({ material }: { material: SmartMaterial }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 64;
    canvas.width = size;
    canvas.height = size;

    // Draw simple preview based on node count
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2d2d2d');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw simple node graph representation
    ctx.strokeStyle = '#ff660066';
    ctx.lineWidth = 1;

    material.nodes.forEach((node, i) => {
      const x = (node.position.x % 200) / 200 * size;
      const y = (node.position.y % 200) / 200 * size;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6600';
      ctx.fill();
    });

    // Draw connections
    material.connections.forEach(conn => {
      const fromNode = material.nodes.find(n => n.id === conn.fromNodeId);
      const toNode = material.nodes.find(n => n.id === conn.toNodeId);
      if (fromNode && toNode) {
        const x1 = (fromNode.position.x % 200) / 200 * size;
        const y1 = (fromNode.position.y % 200) / 200 * size;
        const x2 = (toNode.position.x % 200) / 200 * size;
        const y2 = (toNode.position.y % 200) / 200 * size;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });
  }, [material]);

  return (
    <canvas
      ref={canvasRef}
      className="w-12 h-12 rounded border border-white/10"
    />
  );
}

/**
 * Quick parameter editor for material nodes
 */
function QuickParameterEditor({
  node,
  onChange,
}: {
  node: MaterialNode;
  onChange: (paramId: string, value: number | string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.parameters.length === 0) return null;

  return (
    <div className="border-t border-white/5 mt-2 pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-white/60 hover:text-white/80 mb-2"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {node.type.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
      </button>

      {expanded && (
        <div className="space-y-2 pl-2">
          {node.parameters.slice(0, 4).map(param => (
            <div key={param.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">{param.name}</span>
                <span className="text-[10px] text-white/60">
                  {typeof param.value === 'number' ? param.value.toFixed(2) : String(param.value)}
                </span>
              </div>
              {param.type === 'float' && (
                <Slider
                  value={[param.value as number]}
                  onValueChange={([v]) => onChange(param.id, v)}
                  min={param.min ?? 0}
                  max={param.max ?? 1}
                  step={0.01}
                  className="h-1"
                />
              )}
              {param.type === 'color' && (
                <input
                  type="color"
                  value={param.value as string}
                  onChange={(e) => onChange(param.id, e.target.value)}
                  className="w-full h-6 rounded cursor-pointer"
                />
              )}
            </div>
          ))}
          {node.parameters.length > 4 && (
            <span className="text-[10px] text-white/30 block">
              +{node.parameters.length - 4} more parameters
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Material card in the list
 */
function MaterialCard({
  material,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
  onOpenEditor,
}: {
  material: SmartMaterial;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenEditor: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/material', JSON.stringify({
      id: material.id,
      name: material.name,
      nodes: material.nodes,
      connections: material.connections,
    }));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      onClick={onSelect}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'p-2 rounded-lg cursor-grab transition-all',
        isActive ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-white/5 hover:bg-white/10 border border-transparent',
        isDragging && 'opacity-50 scale-95 cursor-grabbing'
      )}
    >
      <div className="flex items-start gap-2">
        <MaterialPreview material={material} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm text-white font-medium truncate">{material.name}</h4>
          <p className="text-xs text-white/40">{material.nodes.length} nodes</p>
          <p className="text-xs text-white/30">{material.category}</p>
        </div>
      </div>

      {isActive && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpenEditor(); }}
            className="flex-1 h-7 text-xs"
          >
            <GitBranch className="w-3 h-3 mr-1" />
            Edit Nodes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="h-7 px-2"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-7 px-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Built-in material presets for quick use
 */
const MATERIAL_PRESETS = [
  { name: 'Basic Color', category: 'basic', icon: Sparkles },
  { name: 'Scratched Metal', category: 'metal', icon: Layers },
  { name: 'Worn Plastic', category: 'plastic', icon: Sparkles },
  { name: 'Carbon Fiber', category: 'pattern', icon: Layers },
  { name: 'Holographic', category: 'effect', icon: Sparkles },
  { name: 'Camo Pattern', category: 'pattern', icon: Layers },
];

export function MaterialsPanel({
  materials,
  activeMaterialId,
  onSelectMaterial,
  onCreateMaterial,
  onDuplicateMaterial,
  onDeleteMaterial,
  onUpdateMaterial,
  onOpenFullEditor,
  className,
}: MaterialsPanelProps) {
  const [showPresets, setShowPresets] = useState(false);

  const activeMaterial = materials.find(m => m.id === activeMaterialId);

  // Quick parameter change handler
  const handleParameterChange = useCallback((nodeId: string, paramId: string, value: number | string) => {
    if (!activeMaterial) return;

    const updatedNodes = activeMaterial.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          parameters: node.parameters.map(p =>
            p.id === paramId ? { ...p, value } : p
          ),
        };
      }
      return node;
    });

    onUpdateMaterial({
      ...activeMaterial,
      nodes: updatedNodes,
    });
  }, [activeMaterial, onUpdateMaterial]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-white/80">Smart Materials</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
              className="h-7 px-2"
              title="Material Presets"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateMaterial}
              className="h-7 px-2"
              title="New Material"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Presets dropdown */}
        {showPresets && (
          <div className="bg-white/5 rounded-lg p-2 space-y-1 mb-2">
            <span className="text-[10px] text-white/40 block mb-1">Quick Start Presets</span>
            {MATERIAL_PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => {
                  // TODO: Create material from preset
                  onCreateMaterial();
                  setShowPresets(false);
                }}
                className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-white/10 transition-colors text-left"
              >
                <preset.icon className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-white/80">{preset.name}</span>
                <span className="text-[10px] text-white/30 ml-auto">{preset.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Materials List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {materials.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/40 mb-2">No materials yet</p>
              <Button
                size="sm"
                onClick={onCreateMaterial}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create Material
              </Button>
            </div>
          ) : (
            materials.map(material => (
              <MaterialCard
                key={material.id}
                material={material}
                isActive={material.id === activeMaterialId}
                onSelect={() => onSelectMaterial(material.id)}
                onDuplicate={() => onDuplicateMaterial(material.id)}
                onDelete={() => onDeleteMaterial(material.id)}
                onOpenEditor={() => onOpenFullEditor(material.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick Edit Panel for active material */}
      {activeMaterial && activeMaterial.nodes.length > 0 && (
        <div className="p-3 border-t border-white/10 shrink-0">
          <h4 className="text-xs text-white/60 mb-2">Quick Edit</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {activeMaterial.nodes.slice(0, 3).map(node => (
              <QuickParameterEditor
                key={node.id}
                node={node}
                onChange={(paramId, value) => handleParameterChange(node.id, paramId, value)}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenFullEditor(activeMaterial.id)}
            className="w-full mt-2 text-orange-400 hover:text-orange-300"
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            Open Full Editor
          </Button>
        </div>
      )}
    </div>
  );
}
