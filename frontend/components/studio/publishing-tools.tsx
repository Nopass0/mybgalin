'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Video,
  Image,
  Scissors,
  Wand2,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Frame,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Clock,
  Crop,
  Move,
  Maximize2,
  Square,
  RectangleHorizontal,
  Sparkles,
  Palette,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

// Steam Workshop requirements
const STEAM_WORKSHOP_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const STEAM_WORKSHOP_ASPECT_RATIO = 16 / 9;
const STEAM_WORKSHOP_MIN_WIDTH = 512;
const STEAM_WORKSHOP_MAX_WIDTH = 1920;

// Preset aspect ratios
const ASPECT_RATIOS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '16:9', label: '16:9 (Workshop)', ratio: 16 / 9 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '1:1', label: '1:1 (Square)', ratio: 1 },
  { id: '9:16', label: '9:16 (Portrait)', ratio: 9 / 16 },
  { id: '21:9', label: '21:9 (Ultrawide)', ratio: 21 / 9 },
];

// Animated frame styles with previews
const FRAME_STYLES = [
  {
    id: 'none',
    name: 'No Frame',
    preview: null,
    animated: false,
    description: 'Clean look without borders',
  },
  {
    id: 'cs2-gold',
    name: 'CS2 Gold',
    preview: 'linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%)',
    animated: true,
    description: 'Premium gold animated border',
  },
  {
    id: 'cs2-covert',
    name: 'CS2 Covert',
    preview: 'linear-gradient(135deg, #eb4b4b 0%, #a83232 50%, #eb4b4b 100%)',
    animated: true,
    description: 'Red covert rarity style',
  },
  {
    id: 'cs2-classified',
    name: 'CS2 Classified',
    preview: 'linear-gradient(135deg, #d32ce6 0%, #8847ff 50%, #d32ce6 100%)',
    animated: true,
    description: 'Purple classified rarity',
  },
  {
    id: 'cs2-restricted',
    name: 'CS2 Restricted',
    preview: 'linear-gradient(135deg, #8847ff 0%, #5e35b1 50%, #8847ff 100%)',
    animated: true,
    description: 'Purple restricted style',
  },
  {
    id: 'neon-cyan',
    name: 'Neon Cyan',
    preview: 'linear-gradient(135deg, #00ffff 0%, #0088ff 50%, #00ffff 100%)',
    animated: true,
    description: 'Glowing cyan neon effect',
  },
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    preview: 'linear-gradient(135deg, #ff00ff 0%, #ff0080 50%, #ff00ff 100%)',
    animated: true,
    description: 'Vibrant pink neon glow',
  },
  {
    id: 'neon-green',
    name: 'Neon Green',
    preview: 'linear-gradient(135deg, #00ff00 0%, #00cc44 50%, #00ff00 100%)',
    animated: true,
    description: 'Matrix-style green glow',
  },
  {
    id: 'holographic',
    name: 'Holographic',
    preview: 'linear-gradient(135deg, #ff0000 0%, #ff8000 17%, #ffff00 33%, #00ff00 50%, #00ffff 67%, #0080ff 83%, #ff00ff 100%)',
    animated: true,
    description: 'Rainbow holographic shimmer',
  },
  {
    id: 'fire',
    name: 'Fire',
    preview: 'linear-gradient(0deg, #ff0000 0%, #ff4400 25%, #ff8800 50%, #ffcc00 75%, #ffff00 100%)',
    animated: true,
    description: 'Animated flame effect',
  },
  {
    id: 'ice',
    name: 'Ice',
    preview: 'linear-gradient(135deg, #ffffff 0%, #a5d8ff 25%, #74c0fc 50%, #4dabf7 75%, #339af0 100%)',
    animated: true,
    description: 'Frozen ice crystal effect',
  },
  {
    id: 'electric',
    name: 'Electric',
    preview: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #00d4ff 100%)',
    animated: true,
    description: 'Electric lightning effect',
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    preview: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
    animated: false,
    description: 'Clean white border',
  },
  {
    id: 'minimal-black',
    name: 'Minimal Black',
    preview: 'linear-gradient(135deg, #333333 0%, #111111 100%)',
    animated: false,
    description: 'Sleek dark border',
  },
  {
    id: 'metallic-silver',
    name: 'Metallic Silver',
    preview: 'linear-gradient(135deg, #c0c0c0 0%, #808080 25%, #c0c0c0 50%, #a0a0a0 75%, #c0c0c0 100%)',
    animated: true,
    description: 'Brushed metal look',
  },
  {
    id: 'metallic-bronze',
    name: 'Metallic Bronze',
    preview: 'linear-gradient(135deg, #cd7f32 0%, #8b4513 50%, #cd7f32 100%)',
    animated: true,
    description: 'Antique bronze finish',
  },
];

interface PublishProject {
  id: string;
  type: 'video' | 'gif' | 'image';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
  originalFile?: File;
  originalUrl?: string;
  resultUrl?: string;
  resultSize?: number;
  width?: number;
  height?: number;
  frameCount?: number;
  duration?: number;
  expiresAt?: Date;
}

interface CropSettings {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: string;
}

interface FrameSettings {
  enabled: boolean;
  style: string;
  thickness: number;
  animated: boolean;
  glowIntensity: number;
  weaponName: string;
  skinName: string;
  showLabel: boolean;
  labelPosition: 'top' | 'bottom';
  labelStyle: 'gradient' | 'solid' | 'outline';
}

// Use relative URL to leverage Next.js API proxy rewrites
const API_BASE = '';

export default function PublishingTools() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<PublishProject | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'crop' | 'trim' | 'optimize' | 'frame'>('upload');

  // Media dimensions
  const [mediaDimensions, setMediaDimensions] = useState({ width: 0, height: 0 });

  // Crop settings
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    enabled: false,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    aspectRatio: 'free',
  });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [isResizingCrop, setIsResizingCrop] = useState<string | null>(null);
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });

  // Trim settings
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Optimization settings
  const [targetSize, setTargetSize] = useState(2);
  const [optimizationMethod, setOptimizationMethod] = useState<'smart' | 'skip-frames' | 'resize'>('smart');
  const [skipFrames, setSkipFrames] = useState(2);
  const [scale, setScale] = useState(100);
  const [fps, setFps] = useState(15);
  const [outputWidth, setOutputWidth] = useState(640);
  const [outputHeight, setOutputHeight] = useState(360);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Frame settings
  const [frameSettings, setFrameSettings] = useState<FrameSettings>({
    enabled: false,
    style: 'cs2-gold',
    thickness: 8,
    animated: true,
    glowIntensity: 50,
    weaponName: 'AK-47',
    skinName: 'Fire Serpent',
    showLabel: true,
    labelPosition: 'bottom',
    labelStyle: 'gradient',
  });

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<number>(0);
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showFramePreview, setShowFramePreview] = useState(true);

  // Validation
  const [validation, setValidation] = useState({
    sizeOk: false,
    aspectOk: false,
    dimensionsOk: false,
  });

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const isImage = file.type.startsWith('image/') && !isGif;

    if (!isVideo && !isGif && !isImage) {
      alert('Please upload a video, GIF, or image file');
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    const type = isVideo ? 'video' : isGif ? 'gif' : 'image';

    setProject({
      id: crypto.randomUUID(),
      type,
      status: 'ready',
      progress: 100,
      originalFile: file,
      originalUrl: objectUrl,
    });

    setPreviewUrl(objectUrl);

    // Get media dimensions
    if (isVideo) {
      const video = document.createElement('video');
      video.src = objectUrl;
      video.onloadedmetadata = () => {
        setMediaDimensions({ width: video.videoWidth, height: video.videoHeight });
        setOutputWidth(video.videoWidth);
        setOutputHeight(video.videoHeight);
        setCropSettings(prev => ({
          ...prev,
          width: video.videoWidth,
          height: video.videoHeight,
        }));
      };
      setActiveTab('trim');
    } else {
      const img = document.createElement('img');
      img.src = objectUrl;
      img.onload = () => {
        setMediaDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setOutputWidth(img.naturalWidth);
        setOutputHeight(img.naturalHeight);
        setCropSettings(prev => ({
          ...prev,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }));
      };
      setActiveTab('crop');
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Handle video loaded
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setTrimEnd(Math.min(10, duration));
    }
  }, []);

  // Toggle play
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.currentTime = trimStart;
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, trimStart]);

  // Apply crop aspect ratio
  const applyCropAspectRatio = useCallback((ratioId: string) => {
    const ratio = ASPECT_RATIOS.find(r => r.id === ratioId);
    if (!ratio) return;

    setCropSettings(prev => {
      if (!ratio.ratio) {
        return { ...prev, aspectRatio: ratioId };
      }

      const currentRatio = prev.width / prev.height;
      let newWidth = prev.width;
      let newHeight = prev.height;

      if (currentRatio > ratio.ratio) {
        newWidth = prev.height * ratio.ratio;
      } else {
        newHeight = prev.width / ratio.ratio;
      }

      return {
        ...prev,
        aspectRatio: ratioId,
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      };
    });
  }, []);

  // Preset crop sizes
  const presetSizes = [
    { label: '1920×1080', width: 1920, height: 1080 },
    { label: '1280×720', width: 1280, height: 720 },
    { label: '854×480', width: 854, height: 480 },
    { label: '640×360', width: 640, height: 360 },
    { label: '512×288', width: 512, height: 288 },
  ];

  // Process media
  const processMedia = useCallback(async () => {
    if (!project?.originalFile) return;

    setIsOptimizing(true);
    setOptimizationProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', project.originalFile);

      // Crop settings
      if (cropSettings.enabled) {
        formData.append('crop_x', cropSettings.x.toString());
        formData.append('crop_y', cropSettings.y.toString());
        formData.append('crop_width', cropSettings.width.toString());
        formData.append('crop_height', cropSettings.height.toString());
      }

      // Output size
      formData.append('output_width', outputWidth.toString());
      formData.append('output_height', outputHeight.toString());

      // Video trim
      if (project.type === 'video') {
        formData.append('start', trimStart.toString());
        formData.append('duration', (trimEnd - trimStart).toString());
      }

      formData.append('fps', fps.toString());
      formData.append('scale', scale.toString());
      formData.append('target_size', (targetSize * 1024 * 1024).toString());
      formData.append('optimization', optimizationMethod);
      formData.append('skip_frames', skipFrames.toString());

      // Frame settings
      if (frameSettings.enabled) {
        formData.append('frame_style', frameSettings.style);
        formData.append('frame_thickness', frameSettings.thickness.toString());
        formData.append('frame_animated', frameSettings.animated.toString());
        formData.append('frame_glow', frameSettings.glowIntensity.toString());
        formData.append('weapon_name', frameSettings.weaponName);
        formData.append('skin_name', frameSettings.skinName);
        formData.append('show_label', frameSettings.showLabel.toString());
        formData.append('label_position', frameSettings.labelPosition);
        formData.append('label_style', frameSettings.labelStyle);
      }

      const endpoint = project.type === 'video' ? 'convert' : 'optimize';
      const response = await fetch(`${API_BASE}/api/studio/publish/${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Processing failed');

      const result = await response.json();

      // Poll for progress
      const pollProgress = async (jobId: string) => {
        const statusRes = await fetch(`${API_BASE}/api/studio/publish/status/${jobId}`);
        const status = await statusRes.json();

        setOptimizationProgress(status.progress || 0);

        if (status.status === 'completed') {
          setPreviewUrl(`${API_BASE}/api/studio/publish/result/${jobId}`);
          setPreviewSize(status.size);
          setPreviewDimensions({ width: status.width, height: status.height });
          validateResult(status.size, status.width, status.height);
          setIsOptimizing(false);
          setProject(prev => prev ? {
            ...prev,
            resultUrl: `${API_BASE}/api/studio/publish/result/${jobId}`,
            resultSize: status.size,
            width: status.width,
            height: status.height,
          } : null);
        } else if (status.status === 'error') {
          throw new Error(status.error || 'Processing failed');
        } else {
          setTimeout(() => pollProgress(jobId), 500);
        }
      };

      await pollProgress(result.data?.jobId || result.jobId);
    } catch (error) {
      console.error('Processing error:', error);
      setIsOptimizing(false);
      setProject(prev => prev ? { ...prev, status: 'error', error: String(error) } : null);
    }
  }, [project, cropSettings, outputWidth, outputHeight, trimStart, trimEnd, fps, scale, targetSize, optimizationMethod, skipFrames, frameSettings]);

  // Validate result
  const validateResult = useCallback((size: number, width: number, height: number) => {
    const aspectRatio = width / height;
    const targetAspect = 16 / 9;
    const aspectDiff = Math.abs(aspectRatio - targetAspect);

    setValidation({
      sizeOk: size <= STEAM_WORKSHOP_MAX_SIZE,
      aspectOk: aspectDiff < 0.1,
      dimensionsOk: width >= STEAM_WORKSHOP_MIN_WIDTH && width <= STEAM_WORKSHOP_MAX_WIDTH,
    });
  }, []);

  // Download result
  const downloadResult = useCallback(async () => {
    if (!project?.resultUrl) return;

    try {
      const response = await fetch(project.resultUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = project.type === 'image' ? 'png' : 'gif';
      a.download = `${frameSettings.weaponName}_${frameSettings.skinName}_workshop.${ext}`.replace(/\s+/g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [project, frameSettings]);

  // Reset project
  const resetProject = useCallback(() => {
    if (project?.originalUrl) URL.revokeObjectURL(project.originalUrl);
    setProject(null);
    setPreviewUrl(null);
    setActiveTab('upload');
    setTrimStart(0);
    setTrimEnd(10);
    setVideoDuration(0);
    setOptimizationProgress(0);
    setCropSettings({
      enabled: false,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      aspectRatio: 'free',
    });
  }, [project]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Get frame style preview
  const getFrameStylePreview = (styleId: string) => {
    const style = FRAME_STYLES.find(s => s.id === styleId);
    return style?.preview || 'transparent';
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0b] text-white overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Publishing Tools</h2>
              <p className="text-xs text-white/40">Create Steam Workshop covers</p>
            </div>
          </div>
          {project && (
            <Button variant="ghost" size="sm" onClick={resetProject} className="text-white/60 hover:text-white">
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Preview */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {!project ? (
            // Upload zone
            <div
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl hover:border-purple-500/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/gif,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Upload className="w-10 h-10 text-white/40" />
              </div>
              <h3 className="text-lg font-medium mb-2">Upload Video, GIF, or Image</h3>
              <p className="text-sm text-white/40 text-center max-w-md">
                Drag and drop or click to browse.
                <br />
                Supports MP4, WebM, MOV, GIF, PNG, JPG formats.
              </p>
            </div>
          ) : (
            // Preview area
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative bg-[#121214] rounded-xl overflow-hidden flex items-center justify-center">
                {/* Media wrapper - frame overlay is positioned relative to media, not container */}
                <div className="relative inline-block max-w-full max-h-full" style={{ transform: `scale(${zoom})` }}>
                  {project.type === 'video' && project.originalUrl ? (
                    <video
                      ref={videoRef}
                      src={project.originalUrl}
                      className="max-w-full max-h-full block"
                      onLoadedMetadata={handleVideoLoaded}
                      onEnded={() => setIsPlaying(false)}
                      onTimeUpdate={() => {
                        if (videoRef.current && videoRef.current.currentTime >= trimEnd) {
                          videoRef.current.pause();
                          setIsPlaying(false);
                        }
                      }}
                    />
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain block"
                    />
                  ) : (
                    <div className="text-white/40 p-8">No preview available</div>
                  )}

                  {/* Frame preview overlay - now wraps the actual media */}
                  {showFramePreview && frameSettings.enabled && frameSettings.style !== 'none' && (
                    <div
                      className="absolute inset-0 pointer-events-none z-10"
                      style={{
                        borderWidth: `${frameSettings.thickness}px`,
                        borderStyle: 'solid',
                        borderColor: 'transparent',
                        borderImage: `${getFrameStylePreview(frameSettings.style)} 1`,
                        animation: frameSettings.animated ? 'borderGlow 2s ease-in-out infinite' : 'none',
                        boxShadow: frameSettings.animated ? `inset 0 0 ${frameSettings.glowIntensity / 5}px rgba(255,255,255,0.3)` : 'none',
                      }}
                    />
                  )}

                  {/* Label preview - positioned on the media */}
                  {showFramePreview && frameSettings.enabled && frameSettings.showLabel && (
                    <div
                      className={`absolute left-0 right-0 ${frameSettings.labelPosition === 'top' ? 'top-0' : 'bottom-0'} z-10 py-2 px-4 bg-black/70 text-center`}
                    >
                      <span
                        className={`text-lg font-bold ${frameSettings.labelStyle === 'gradient' ? 'bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent' : frameSettings.labelStyle === 'outline' ? 'text-transparent' : 'text-white'}`}
                        style={frameSettings.labelStyle === 'outline' ? { WebkitTextStroke: '1px white' } : {}}
                      >
                        {frameSettings.weaponName} | {frameSettings.skinName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Processing overlay */}
                {isOptimizing && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                    <p className="text-lg mb-2">Processing...</p>
                    <Progress value={optimizationProgress} className="w-64 h-2" />
                    <p className="text-sm text-white/40 mt-2">{optimizationProgress}%</p>
                  </div>
                )}
              </div>

              {/* Video controls - always visible for video */}
              {project.type === 'video' && (
                <div className="mt-4 p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/10">
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = trimStart;
                        }
                      }}
                      className="text-white hover:bg-white/10"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Start: {formatTime(trimStart)}</span>
                        <span>End: {formatTime(trimEnd)}</span>
                      </div>
                      <div className="relative h-2 bg-white/10 rounded-full">
                        <div
                          className="absolute h-full bg-purple-500 rounded-full"
                          style={{
                            left: `${(trimStart / videoDuration) * 100}%`,
                            width: `${((trimEnd - trimStart) / videoDuration) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-white/40 min-w-[80px] text-right">
                      Duration: {formatTime(trimEnd - trimStart)}
                    </span>
                  </div>
                  {/* Trim sliders only in trim tab */}
                  {activeTab === 'trim' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-white/60">Start Time</Label>
                        <Slider
                          value={[trimStart]}
                          min={0}
                          max={Math.max(0, trimEnd - 0.1)}
                          step={0.1}
                          onValueChange={([v]) => setTrimStart(v)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-white/60">End Time</Label>
                        <Slider
                          value={[trimEnd]}
                          min={trimStart + 0.1}
                          max={videoDuration}
                          step={0.1}
                          onValueChange={([v]) => setTrimEnd(v)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview info */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {previewDimensions && (
                    <span className="text-white/60">
                      {previewDimensions.width} × {previewDimensions.height} px
                    </span>
                  )}
                  {previewSize > 0 && (
                    <span className={previewSize <= STEAM_WORKSHOP_MAX_SIZE ? 'text-green-400' : 'text-red-400'}>
                      {formatSize(previewSize)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="text-white/60">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white/60 text-xs min-w-[48px] text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="text-white/60">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Settings */}
        {project && (
          <div className="w-96 border-l border-white/10 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
              <TabsList className="flex-none mx-4 mt-4 bg-white/5 grid grid-cols-4">
                <TabsTrigger value="crop" className="text-xs">
                  <Crop className="w-3 h-3 mr-1" />
                  Crop
                </TabsTrigger>
                {project.type === 'video' && (
                  <TabsTrigger value="trim" className="text-xs">
                    <Scissors className="w-3 h-3 mr-1" />
                    Trim
                  </TabsTrigger>
                )}
                <TabsTrigger value="optimize" className="text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  Size
                </TabsTrigger>
                <TabsTrigger value="frame" className="text-xs">
                  <Frame className="w-3 h-3 mr-1" />
                  Frame
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto p-4">
                {/* Crop tab */}
                <TabsContent value="crop" className="m-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable Cropping</Label>
                    <Switch
                      checked={cropSettings.enabled}
                      onCheckedChange={(checked) => setCropSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>

                  {cropSettings.enabled && (
                    <>
                      <div>
                        <Label className="text-xs text-white/60">Aspect Ratio</Label>
                        <Select value={cropSettings.aspectRatio} onValueChange={applyCropAspectRatio}>
                          <SelectTrigger className="mt-2 bg-white/5 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1c] border-white/10">
                            {ASPECT_RATIOS.map(ratio => (
                              <SelectItem key={ratio.id} value={ratio.id} className="text-white">
                                {ratio.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-white/60">Width</Label>
                          <Input
                            type="number"
                            value={cropSettings.width}
                            onChange={(e) => setCropSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                            className="mt-1 bg-white/5 border-white/10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/60">Height</Label>
                          <Input
                            type="number"
                            value={cropSettings.height}
                            onChange={(e) => setCropSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                            className="mt-1 bg-white/5 border-white/10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-white/60">X Position</Label>
                          <Input
                            type="number"
                            value={cropSettings.x}
                            onChange={(e) => setCropSettings(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                            className="mt-1 bg-white/5 border-white/10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/60">Y Position</Label>
                          <Input
                            type="number"
                            value={cropSettings.y}
                            onChange={(e) => setCropSettings(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                            className="mt-1 bg-white/5 border-white/10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-white/60 mb-2 block">Preset Sizes</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {presetSizes.map(preset => (
                            <Button
                              key={preset.label}
                              variant="outline"
                              size="sm"
                              className="bg-white/5 border-white/10 text-xs"
                              onClick={() => {
                                setOutputWidth(preset.width);
                                setOutputHeight(preset.height);
                                setCropSettings(prev => ({
                                  ...prev,
                                  width: preset.width,
                                  height: preset.height,
                                }));
                              }}
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Trim tab (video only) */}
                <TabsContent value="trim" className="m-0 space-y-4">
                  <div>
                    <Label className="text-xs text-white/60">FPS</Label>
                    <Slider
                      value={[fps]}
                      min={5}
                      max={30}
                      step={1}
                      onValueChange={([v]) => setFps(v)}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-1">
                      <span>5</span>
                      <span className="text-white">{fps} fps</span>
                      <span>30</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-white/60">Output Width</Label>
                    <Input
                      type="number"
                      value={outputWidth}
                      onChange={(e) => setOutputWidth(parseInt(e.target.value) || 640)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-white/60">Output Height</Label>
                    <Input
                      type="number"
                      value={outputHeight}
                      onChange={(e) => setOutputHeight(parseInt(e.target.value) || 360)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                </TabsContent>

                {/* Optimize tab */}
                <TabsContent value="optimize" className="m-0 space-y-4">
                  <div>
                    <Label className="text-xs text-white/60">Target Size (MB)</Label>
                    <Slider
                      value={[targetSize]}
                      min={0.5}
                      max={5}
                      step={0.1}
                      onValueChange={([v]) => setTargetSize(v)}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-1">
                      <span>0.5 MB</span>
                      <span className={targetSize <= 2 ? 'text-green-400' : 'text-yellow-400'}>
                        {targetSize.toFixed(1)} MB
                      </span>
                      <span>5 MB</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-white/60">Optimization Method</Label>
                    <Select value={optimizationMethod} onValueChange={(v) => setOptimizationMethod(v as typeof optimizationMethod)}>
                      <SelectTrigger className="mt-2 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1c] border-white/10">
                        <SelectItem value="smart" className="text-white">Smart (Auto)</SelectItem>
                        <SelectItem value="skip-frames" className="text-white">Skip Frames</SelectItem>
                        <SelectItem value="resize" className="text-white">Resize Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {optimizationMethod === 'skip-frames' && (
                    <div>
                      <Label className="text-xs text-white/60">Keep every N frames</Label>
                      <Slider
                        value={[skipFrames]}
                        min={2}
                        max={10}
                        step={1}
                        onValueChange={([v]) => setSkipFrames(v)}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span>2</span>
                        <span className="text-white">Every {skipFrames} frame</span>
                        <span>10</span>
                      </div>
                    </div>
                  )}

                  {/* Validation */}
                  <div className="p-3 bg-white/5 rounded-lg space-y-2">
                    <div className="text-xs text-white/60">Steam Workshop</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        {validation.sizeOk ? <CheckCircle className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-red-400" />}
                        <span className={validation.sizeOk ? 'text-green-400' : 'text-red-400'}>Size ≤ 2 MB</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {validation.aspectOk ? <CheckCircle className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-yellow-400" />}
                        <span className={validation.aspectOk ? 'text-green-400' : 'text-yellow-400'}>Aspect ~16:9</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {validation.dimensionsOk ? <CheckCircle className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-yellow-400" />}
                        <span className={validation.dimensionsOk ? 'text-green-400' : 'text-yellow-400'}>Width 512-1920px</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Frame tab */}
                <TabsContent value="frame" className="m-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable Frame</Label>
                    <Switch
                      checked={frameSettings.enabled}
                      onCheckedChange={(checked) => setFrameSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>

                  {frameSettings.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-white/60">Show Preview</Label>
                        <Switch
                          checked={showFramePreview}
                          onCheckedChange={setShowFramePreview}
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-white/60 mb-2 block">Frame Style</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-auto pr-1">
                          {FRAME_STYLES.map(style => (
                            <button
                              key={style.id}
                              onClick={() => setFrameSettings(prev => ({
                                ...prev,
                                style: style.id,
                                animated: style.animated,
                              }))}
                              className={`p-2 rounded-lg border transition-all ${frameSettings.style === style.id ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 hover:border-white/30'}`}
                            >
                              <div
                                className="w-full h-8 rounded mb-1"
                                style={{ background: style.preview || '#333' }}
                              />
                              <div className="text-xs text-white truncate">{style.name}</div>
                              {style.animated && (
                                <div className="flex items-center gap-1 text-[10px] text-purple-400">
                                  <Sparkles className="w-2 h-2" />
                                  Animated
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-white/60">Thickness</Label>
                        <Slider
                          value={[frameSettings.thickness]}
                          min={2}
                          max={20}
                          step={1}
                          onValueChange={([v]) => setFrameSettings(prev => ({ ...prev, thickness: v }))}
                          className="mt-2"
                        />
                        <div className="text-xs text-white/40 mt-1 text-center">{frameSettings.thickness}px</div>
                      </div>

                      {frameSettings.animated && (
                        <div>
                          <Label className="text-xs text-white/60">Glow Intensity</Label>
                          <Slider
                            value={[frameSettings.glowIntensity]}
                            min={0}
                            max={100}
                            step={5}
                            onValueChange={([v]) => setFrameSettings(prev => ({ ...prev, glowIntensity: v }))}
                            className="mt-2"
                          />
                          <div className="text-xs text-white/40 mt-1 text-center">{frameSettings.glowIntensity}%</div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Show Label</Label>
                        <Switch
                          checked={frameSettings.showLabel}
                          onCheckedChange={(checked) => setFrameSettings(prev => ({ ...prev, showLabel: checked }))}
                        />
                      </div>

                      {frameSettings.showLabel && (
                        <>
                          <div>
                            <Label className="text-xs text-white/60">Weapon Name</Label>
                            <Input
                              value={frameSettings.weaponName}
                              onChange={(e) => setFrameSettings(prev => ({ ...prev, weaponName: e.target.value }))}
                              placeholder="AK-47"
                              className="mt-1 bg-white/5 border-white/10"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-white/60">Skin Name</Label>
                            <Input
                              value={frameSettings.skinName}
                              onChange={(e) => setFrameSettings(prev => ({ ...prev, skinName: e.target.value }))}
                              placeholder="Fire Serpent"
                              className="mt-1 bg-white/5 border-white/10"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-white/60">Label Position</Label>
                            <Select
                              value={frameSettings.labelPosition}
                              onValueChange={(v) => setFrameSettings(prev => ({ ...prev, labelPosition: v as 'top' | 'bottom' }))}
                            >
                              <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1c] border-white/10">
                                <SelectItem value="top" className="text-white">Top</SelectItem>
                                <SelectItem value="bottom" className="text-white">Bottom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs text-white/60">Label Style</Label>
                            <Select
                              value={frameSettings.labelStyle}
                              onValueChange={(v) => setFrameSettings(prev => ({ ...prev, labelStyle: v as 'gradient' | 'solid' | 'outline' }))}
                            >
                              <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1c] border-white/10">
                                <SelectItem value="gradient" className="text-white">Gradient</SelectItem>
                                <SelectItem value="solid" className="text-white">Solid White</SelectItem>
                                <SelectItem value="outline" className="text-white">Outline</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </TabsContent>
              </div>

              {/* Action buttons */}
              <div className="flex-none p-4 border-t border-white/10 space-y-2">
                <Button
                  onClick={processMedia}
                  disabled={isOptimizing}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isOptimizing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Process {project.type === 'video' ? 'Video' : project.type === 'gif' ? 'GIF' : 'Image'}
                </Button>

                {project.resultUrl && (
                  <>
                    <Button onClick={downloadResult} className="w-full bg-green-600 hover:bg-green-700">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Clock className="w-3 h-3" />
                      <span>File expires in 1 hour</span>
                    </div>
                  </>
                )}
              </div>
            </Tabs>
          </div>
        )}
      </div>

      {/* CSS for animated border */}
      <style jsx global>{`
        @keyframes borderGlow {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.3) saturate(1.2); }
        }
      `}</style>
    </div>
  );
}
