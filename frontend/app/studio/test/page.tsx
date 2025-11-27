'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import {
  Palette,
  Layers,
  Paintbrush,
  Type,
  Shapes,
  Sparkles,
  Settings,
  Eye,
  Sliders,
  Grid,
  Wand2,
  Pipette,
  Download,
  Network,
  Mountain,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';

// Dynamic imports to prevent SSR issues
const StudioColorPicker = dynamic(() => import('@/components/studio/color-picker').then(m => ({ default: m.StudioColorPicker })), { ssr: false });
const StudioBrushSettings = dynamic(() => import('@/components/studio/brush-settings').then(m => ({ default: m.StudioBrushSettings })), { ssr: false });
const StudioLayersPanel = dynamic(() => import('@/components/studio/layers-panel').then(m => ({ default: m.StudioLayersPanel })), { ssr: false });
const TextToolPanel = dynamic(() => import('@/components/studio/text-tool-panel').then(m => ({ default: m.TextToolPanel })), { ssr: false });
const ShapeToolPanel = dynamic(() => import('@/components/studio/shape-tool-panel').then(m => ({ default: m.ShapeToolPanel })), { ssr: false });
const GeneratorsPanel = dynamic(() => import('@/components/studio/generators-panel').then(m => ({ default: m.GeneratorsPanel })), { ssr: false });
const MaterialMapPanel = dynamic(() => import('@/components/studio/material-map-panel').then(m => ({ default: m.MaterialMapPanel })), { ssr: false });
const ExportDialog = dynamic(() => import('@/components/studio/export-dialog').then(m => ({ default: m.ExportDialog })), { ssr: false });
const CS2RenderPreview = dynamic(() => import('@/components/studio/cs2-render-preview').then(m => ({ default: m.CS2RenderPreview })), { ssr: false });
const NodeEditor = dynamic(() => import('@/components/studio/node-editor').then(m => ({ default: m.NodeEditor })), { ssr: false });
const StudioToolbar = dynamic(() => import('@/components/studio/toolbar').then(m => ({ default: m.StudioToolbar })), { ssr: false });
const StudioMapTabs = dynamic(() => import('@/components/studio/map-tabs').then(m => ({ default: m.StudioMapTabs })), { ssr: false });

// Context menu components (also need ssr: false due to portal usage)
const ContextMenu = dynamic(() => import('@/components/studio/context-menu').then(m => ({ default: m.ContextMenu })), { ssr: false });
const BrushContextMenu = dynamic(() => import('@/components/studio/context-menu').then(m => ({ default: m.BrushContextMenu })), { ssr: false });
const FilterContextMenu = dynamic(() => import('@/components/studio/context-menu').then(m => ({ default: m.FilterContextMenu })), { ssr: false });

// Component info card (placeholder for components that require complex props)
function ComponentInfoCard({
  name,
  file,
  requiredProps,
  description
}: {
  name: string;
  file: string;
  requiredProps: string[];
  description: string;
}) {
  return (
    <div className="w-full h-full bg-zinc-900 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-orange-400">
        <Info className="w-4 h-4" />
        <span className="font-medium">{name}</span>
      </div>
      <p className="text-xs text-white/60">{description}</p>
      <div className="mt-2">
        <div className="text-[10px] text-white/40 mb-1">Source File:</div>
        <code className="text-xs bg-black/30 px-2 py-1 rounded text-green-400">{file}</code>
      </div>
      <div className="mt-2">
        <div className="text-[10px] text-white/40 mb-1">Required Props:</div>
        <div className="flex flex-wrap gap-1">
          {requiredProps.map(prop => (
            <span key={prop} className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded">
              {prop}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto text-[10px] text-white/30">
        Use with useStudioEditor hook for full functionality
      </div>
    </div>
  );
}

// Component category definition
interface ComponentShowcase {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  width?: string;
  height?: string;
}

// Categories
const categories = [
  {
    id: 'core',
    name: 'Core Components',
    icon: <Grid className="w-4 h-4" />,
    components: [
      {
        id: 'toolbar',
        name: 'Toolbar',
        description: 'Main tool selection toolbar with all drawing and editing tools',
        icon: <Paintbrush className="w-4 h-4" />,
        component: <StudioToolbar />,
        height: '600px',
        width: '64px',
      },
      {
        id: 'layers-panel',
        name: 'Layers Panel',
        description: 'Layer management with drag-and-drop, visibility, locking, and blend modes',
        icon: <Layers className="w-4 h-4" />,
        component: <StudioLayersPanel />,
        width: '320px',
        height: '500px',
      },
      {
        id: 'map-tabs',
        name: 'Map Tabs',
        description: 'Tabs for switching between different material map types',
        icon: <Mountain className="w-4 h-4" />,
        component: <StudioMapTabs activeTab="color" onChange={() => {}} />,
        height: '60px',
        width: '100%',
      },
    ],
  },
  {
    id: 'color',
    name: 'Color & Brush',
    icon: <Palette className="w-4 h-4" />,
    components: [
      {
        id: 'color-picker',
        name: 'Color Picker',
        description: 'Advanced color picker with HSL/RGB modes, swatches, and history',
        icon: <Pipette className="w-4 h-4" />,
        component: <StudioColorPicker />,
        width: '280px',
        height: '400px',
      },
      {
        id: 'brush-settings',
        name: 'Brush Settings',
        description: 'Brush configuration with size, opacity, hardness, and presets',
        icon: <Paintbrush className="w-4 h-4" />,
        component: <StudioBrushSettings />,
        width: '280px',
        height: '500px',
      },
    ],
  },
  {
    id: 'tools',
    name: 'Tool Panels',
    icon: <Shapes className="w-4 h-4" />,
    components: [
      {
        id: 'text-tool',
        name: 'Text Tool Panel',
        description: 'Text editing with fonts, styles, alignment, and effects',
        icon: <Type className="w-4 h-4" />,
        component: <TextToolPanel className="w-full h-full" />,
        width: '300px',
        height: '500px',
      },
      {
        id: 'shape-tool',
        name: 'Shape Tool Panel',
        description: 'Vector shapes with fill, stroke, and transform options',
        icon: <Shapes className="w-4 h-4" />,
        component: <ShapeToolPanel className="w-full h-full" />,
        width: '300px',
        height: '450px',
      },
    ],
  },
  {
    id: 'generators',
    name: 'Generators & Materials',
    icon: <Wand2 className="w-4 h-4" />,
    components: [
      {
        id: 'generators',
        name: 'Texture Generators',
        description: 'Procedural texture generation (noise, patterns, materials)',
        icon: <Wand2 className="w-4 h-4" />,
        component: (
          <GeneratorsPanel
            onApplyToLayer={() => {}}
            onCreateLayer={() => {}}
            className="w-full h-full"
          />
        ),
        width: '280px',
        height: '600px',
      },
      {
        id: 'materials',
        name: 'Materials Panel',
        description: 'PBR material presets and configuration',
        icon: <Sparkles className="w-4 h-4" />,
        component: (
          <ComponentInfoCard
            name="MaterialsPanel"
            file="components/studio/materials-panel.tsx"
            requiredProps={['materials', 'activeMaterialId', 'onSelectMaterial', 'onCreateMaterial', 'onUpdateMaterial']}
            description="Smart material library with PBR presets. Requires material state management."
          />
        ),
        width: '280px',
        height: '300px',
      },
      {
        id: 'material-map-normal',
        name: 'Normal Map Editor',
        description: 'Generate and edit normal maps from images',
        icon: <Mountain className="w-4 h-4" />,
        component: <MaterialMapPanel mapType="normal" className="w-full h-full" />,
        width: '280px',
        height: '500px',
      },
      {
        id: 'material-map-metalness',
        name: 'Metalness Editor',
        description: 'Edit metalness/roughness maps with presets',
        icon: <Sparkles className="w-4 h-4" />,
        component: <MaterialMapPanel mapType="metalness" className="w-full h-full" />,
        width: '280px',
        height: '450px',
      },
    ],
  },
  {
    id: 'effects',
    name: 'Effects & Adjustments',
    icon: <Sliders className="w-4 h-4" />,
    components: [
      {
        id: 'layer-effects',
        name: 'Layer Effects',
        description: 'Drop shadow, glow, bevel, stroke, and other effects',
        icon: <Sparkles className="w-4 h-4" />,
        component: (
          <ComponentInfoCard
            name="LayerEffectsPanel"
            file="components/studio/layer-effects-panel.tsx"
            requiredProps={['layer', 'onUpdateLayer']}
            description="Layer effects editor with shadow, glow, bevel, and more."
          />
        ),
        width: '300px',
        height: '250px',
      },
      {
        id: 'color-adjustments',
        name: 'Color Adjustments',
        description: 'Brightness, contrast, hue, saturation, curves',
        icon: <Sliders className="w-4 h-4" />,
        component: (
          <ComponentInfoCard
            name="ColorAdjustmentsPanel"
            file="components/studio/color-adjustments-panel.tsx"
            requiredProps={['layer', 'onApplyAdjustment']}
            description="Color correction and adjustments panel."
          />
        ),
        width: '300px',
        height: '250px',
      },
      {
        id: 'smart-masks',
        name: 'Smart Masks',
        description: 'AI-powered selection and masking tools',
        icon: <Wand2 className="w-4 h-4" />,
        component: (
          <ComponentInfoCard
            name="SmartMasksPanel"
            file="components/studio/smart-masks-panel.tsx"
            requiredProps={['masks', 'onApplyMask', 'onCreateMask']}
            description="Smart selection and masking with AI assistance."
          />
        ),
        width: '280px',
        height: '250px',
      },
    ],
  },
  {
    id: 'preview',
    name: 'Preview & Export',
    icon: <Eye className="w-4 h-4" />,
    components: [
      {
        id: 'cs2-preview',
        name: 'CS2 Render Preview',
        description: '3D sticker preview with PBR lighting and rotation',
        icon: <Eye className="w-4 h-4" />,
        component: <CS2RenderPreview className="w-full h-full" />,
        width: '400px',
        height: '600px',
      },
      {
        id: 'environment',
        name: 'Environment Panel',
        description: 'Lighting and environment settings for preview',
        icon: <Settings className="w-4 h-4" />,
        component: (
          <ComponentInfoCard
            name="EnvironmentPanel"
            file="components/studio/environment-panel.tsx"
            requiredProps={['settings', 'onChange']}
            description="Environment and lighting configuration for 3D preview."
          />
        ),
        width: '280px',
        height: '250px',
      },
      {
        id: 'lenticular',
        name: 'Lenticular Editor',
        description: 'Create lenticular/holographic effects',
        icon: <Sparkles className="w-4 h-4" />,
        component: (
          <ComponentInfoCard
            name="LenticularEditor"
            file="components/studio/lenticular-editor.tsx"
            requiredProps={['frames', 'onAddFrame', 'onRemoveFrame', 'onExport']}
            description="Lenticular/holographic animation creator."
          />
        ),
        width: '350px',
        height: '250px',
      },
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    icon: <Network className="w-4 h-4" />,
    components: [
      {
        id: 'node-editor',
        name: 'Node Editor',
        description: 'Node-based material and effect composition',
        icon: <Network className="w-4 h-4" />,
        component: <NodeEditor className="w-full h-full" />,
        width: '100%',
        height: '500px',
      },
    ],
  },
  {
    id: 'context-menus',
    name: 'Context Menus',
    icon: <Settings className="w-4 h-4" />,
    components: [
      {
        id: 'brush-context',
        name: 'Brush Context Menu',
        description: 'Quick brush settings on right-click',
        icon: <Paintbrush className="w-4 h-4" />,
        component: (
          <div className="relative w-full h-full bg-zinc-900 rounded-lg p-4">
            <div className="text-xs text-white/40 mb-2">Right-click menu for brush tool:</div>
            <BrushContextMenu
              x={20}
              y={40}
              brushSize={24}
              brushOpacity={100}
              brushHardness={80}
              primaryColor="#ff6600"
              secondaryColor="#000000"
              onBrushSizeChange={() => {}}
              onBrushOpacityChange={() => {}}
              onBrushHardnessChange={() => {}}
              onPrimaryColorChange={() => {}}
              onSecondaryColorChange={() => {}}
              onClose={() => {}}
            />
          </div>
        ),
        width: '350px',
        height: '300px',
      },
      {
        id: 'filter-context',
        name: 'Filter Context Menu',
        description: 'Quick filter settings on right-click',
        icon: <Sliders className="w-4 h-4" />,
        component: (
          <div className="relative w-full h-full bg-zinc-900 rounded-lg p-4">
            <div className="text-xs text-white/40 mb-2">Right-click menu for filter tools:</div>
            <FilterContextMenu
              x={20}
              y={40}
              strength={50}
              brushSize={30}
              onStrengthChange={() => {}}
              onBrushSizeChange={() => {}}
              onClose={() => {}}
              toolName="blur"
            />
          </div>
        ),
        width: '300px',
        height: '250px',
      },
      {
        id: 'general-context',
        name: 'General Context Menu',
        description: 'Standard context menu component',
        icon: <Settings className="w-4 h-4" />,
        component: (
          <div className="relative w-full h-full bg-zinc-900 rounded-lg p-4">
            <div className="text-xs text-white/40 mb-2">General context menu:</div>
            <ContextMenu
              items={[
                { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
                { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
                { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
                { id: 'sep1', label: '', separator: true },
                { id: 'delete', label: 'Delete', shortcut: 'Del' },
                { id: 'sep2', label: '', separator: true },
                { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A' },
              ]}
              x={20}
              y={40}
              onClose={() => {}}
            />
          </div>
        ),
        width: '280px',
        height: '280px',
      },
    ],
  },
];

export default function StudioTestPage() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );
  const [showExportDialog, setShowExportDialog] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#121214] border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Studio Components</h1>
            <p className="text-sm text-white/50">Component library for CS2 Skin Studio</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Dialog Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a1c] rounded-lg p-4 border border-white/10">
            <div className="text-3xl font-bold text-orange-500">
              {categories.reduce((acc, cat) => acc + cat.components.length, 0)}
            </div>
            <div className="text-sm text-white/50">Total Components</div>
          </div>
          <div className="bg-[#1a1a1c] rounded-lg p-4 border border-white/10">
            <div className="text-3xl font-bold text-blue-500">{categories.length}</div>
            <div className="text-sm text-white/50">Categories</div>
          </div>
          <div className="bg-[#1a1a1c] rounded-lg p-4 border border-white/10">
            <div className="text-3xl font-bold text-green-500">22</div>
            <div className="text-sm text-white/50">Source Files</div>
          </div>
          <div className="bg-[#1a1a1c] rounded-lg p-4 border border-white/10">
            <div className="text-3xl font-bold text-purple-500">~500KB</div>
            <div className="text-sm text-white/50">Total Size</div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category.id} className="bg-[#1a1a1c] rounded-xl border border-white/10 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <span className="text-orange-500">{category.icon}</span>
                <span className="font-medium text-lg">{category.name}</span>
                <span className="text-sm text-white/40 ml-2">
                  ({category.components.length} components)
                </span>
                <div className="flex-1" />
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/40" />
                )}
              </button>

              {/* Components grid */}
              {expandedCategories.has(category.id) && (
                <div className="p-6 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.components.map(comp => (
                      <motion.div
                        key={comp.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0f0f11] rounded-lg border border-white/10 overflow-hidden"
                      >
                        {/* Component header */}
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                          <span className="text-orange-400">{comp.icon}</span>
                          <span className="font-medium text-sm">{comp.name}</span>
                        </div>

                        {/* Component description */}
                        <div className="px-4 py-2 text-xs text-white/50 border-b border-white/5">
                          {comp.description}
                        </div>

                        {/* Component preview */}
                        <div
                          className="relative overflow-auto bg-[#0a0a0c]"
                          style={{
                            width: comp.width || '100%',
                            height: comp.height || '300px',
                            maxWidth: '100%',
                          }}
                        >
                          {comp.component}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Usage guide */}
        <div className="mt-12 bg-[#1a1a1c] rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-bold mb-4">Usage Guide</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-orange-400 mb-2">Import Components</h3>
              <pre className="bg-[#0a0a0c] rounded-lg p-4 text-xs overflow-auto">
{`import { StudioColorPicker } from '@/components/studio/color-picker';
import { StudioBrushSettings } from '@/components/studio/brush-settings';
import { StudioLayersPanel } from '@/components/studio/layers-panel';
import { NodeEditor } from '@/components/studio/node-editor';
import { CS2RenderPreview } from '@/components/studio/cs2-render-preview';`}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-orange-400 mb-2">Use with StudioEditor</h3>
              <pre className="bg-[#0a0a0c] rounded-lg p-4 text-xs overflow-auto">
{`import { useStudioEditor } from '@/hooks/useStudioEditor';

function MyComponent() {
  const {
    layers,
    activeLayerId,
    addLayer,
    updateLayer,
    primaryColor,
    currentBrush,
  } = useStudioEditor();

  return <StudioLayersPanel />;
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* File list */}
        <div className="mt-8 bg-[#1a1a1c] rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-bold mb-4">Component Files</h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              'auth-provider.tsx',
              'brush-settings.tsx',
              'canvas.tsx',
              'color-adjustments-panel.tsx',
              'color-picker.tsx',
              'context-menu.tsx',
              'cs2-render-preview.tsx',
              'environment-panel.tsx',
              'export-dialog.tsx',
              'generators-panel.tsx',
              'layer-effects-panel.tsx',
              'layers-panel.tsx',
              'lenticular-editor.tsx',
              'map-tabs.tsx',
              'material-map-panel.tsx',
              'materials-panel.tsx',
              'node-editor.tsx',
              'shape-tool-panel.tsx',
              'smart-masks-panel.tsx',
              'text-tool-panel.tsx',
              'toolbar.tsx',
            ].map(file => (
              <code key={file} className="bg-black/30 px-2 py-1 rounded text-green-400">
                {file}
              </code>
            ))}
          </div>
        </div>
      </main>

      {/* Export dialog */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          projectName="Demo Project"
          layers={[]}
          canvasWidth={1024}
          canvasHeight={1024}
          stickerType="paper"
        />
      )}
    </div>
  );
}
