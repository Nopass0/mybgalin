"use client";

import { Eye, Heart, Users, ExternalLink, Calendar } from "lucide-react";
import Image from "next/image";
import { motion } from "motion/react";

interface WorkshopTag {
  tag: string;
}

interface WorkshopItem {
  publishedfileid: string;
  title: string;
  description: string;
  preview_url: string;
  time_created: number;
  time_updated: number;
  subscriptions: number;
  favorited: number;
  views: number;
  tags: WorkshopTag[];
  file_url?: string;
  file_size: number;
}

interface WorkshopCardProps {
  item: WorkshopItem;
  gameName?: string;
}

export function WorkshopCard({ item, gameName }: WorkshopCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const workshopUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`;

  // Truncate description to 150 characters
  const truncatedDescription =
    item.description.length > 150
      ? item.description.substring(0, 150) + "..."
      : item.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <div className="group relative h-full bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden">
        {/* Preview Image */}
        <div className="relative aspect-video w-full bg-[#121214] overflow-hidden">
          {item.preview_url ? (
            <Image
              src={item.preview_url}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              <span className="text-white/40">No Preview</span>
            </div>
          )}

          {/* Overlay with link */}
          <a
            href={workshopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-sm">
              <ExternalLink className="h-4 w-4" />
              <span className="text-sm font-medium">View on Steam</span>
            </div>
          </a>
        </div>

        <div className="p-4 space-y-3">
          {/* Title and Badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white line-clamp-2">{item.title}</h3>
            {gameName && (
              <span className="shrink-0 px-2 py-0.5 text-xs bg-white/10 rounded text-white/60">
                {gameName.toUpperCase()}
              </span>
            )}
          </div>

          {/* Description */}
          {truncatedDescription && (
            <p className="text-sm text-white/40 line-clamp-3">
              {truncatedDescription}
            </p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-3 text-xs text-white/40">
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{formatNumber(item.views)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{formatNumber(item.subscriptions)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              <span>{formatNumber(item.favorited)}</span>
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-white/5 border border-white/10 rounded text-white/50"
                >
                  {tag.tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs bg-white/5 border border-white/10 rounded text-white/50">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Calendar className="h-3.5 w-3.5" />
            <span>Updated {formatDate(item.time_updated)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
