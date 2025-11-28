/**
 * Map Tabs Component
 *
 * Tab navigation for switching between texture maps in the CS2 Skin Studio.
 * Allows quick access to different PBR texture channels.
 *
 * Texture maps:
 * - Albedo (base color)
 * - Normal (surface detail)
 * - Roughness (surface smoothness)
 * - Metalness (metallic/dielectric)
 * - Ambient Occlusion (contact shadows)
 *
 * @module components/studio/map-tabs
 */

'use client';

import { motion } from 'motion/react';
import { Image, CircleDot, Sparkles, Circle, Eye } from 'lucide-react';

interface MapTabsProps {
  activeTab: 'color' | 'normal' | 'metalness' | 'roughness' | 'render';
  onChange: (tab: 'color' | 'normal' | 'metalness' | 'roughness' | 'render') => void;
}

const tabs = [
  { id: 'color' as const, label: 'Color', icon: Image, color: '#ffffff' },
  { id: 'normal' as const, label: 'Normal', icon: CircleDot, color: '#8080ff' },
  { id: 'metalness' as const, label: 'Metalness', icon: Sparkles, color: '#888888' },
  { id: 'roughness' as const, label: 'Roughness', icon: Circle, color: '#666666' },
  { id: 'render' as const, label: 'CS2 Preview', icon: Eye, color: '#f97316' },
];

export function StudioMapTabs({ activeTab, onChange }: MapTabsProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10 bg-[#0f0f10]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-white'
              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeMapTab"
              className="absolute inset-0 bg-white/10 rounded-lg"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <tab.icon
              className="w-3.5 h-3.5"
              style={{ color: activeTab === tab.id ? tab.color : undefined }}
            />
            {tab.label}
          </span>
        </button>
      ))}

      <div className="flex-1" />

      <span className="text-[10px] text-white/30 pr-2">
        1024 × 1024 px
      </span>
    </div>
  );
}
