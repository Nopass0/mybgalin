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
  Trash2,
  Settings,
  Frame,
  Type,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Clock,
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

// Steam Workshop requirements
const STEAM_WORKSHOP_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const STEAM_WORKSHOP_ASPECT_RATIO = 16 / 9; // 16:9 recommended
const STEAM_WORKSHOP_MIN_WIDTH = 512;
const STEAM_WORKSHOP_MAX_WIDTH = 1920;

interface PublishProject {
  id: string;
  type: 'video' | 'gif';
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

interface FrameSettings {
  enabled: boolean;
  style: 'gradient' | 'metallic' | 'neon' | 'minimal' | 'cs2';
  color: string;
  weaponName: string;
  skinName: string;
  showLabel: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PublishingTools() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [project, setProject] = useState<PublishProject | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'trim' | 'optimize' | 'frame'>('upload');

  // Trim settings
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Optimization settings
  const [targetSize, setTargetSize] = useState(2); // MB
  const [optimizationMethod, setOptimizationMethod] = useState<'smart' | 'skip-frames' | 'resize'>('smart');
  const [skipFrames, setSkipFrames] = useState(2);
  const [scale, setScale] = useState(100);
  const [fps, setFps] = useState(15);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Frame settings
  const [frameSettings, setFrameSettings] = useState<FrameSettings>({
    enabled: false,
    style: 'cs2',
    color: '#ff6600',
    weaponName: 'AK-47',
    skinName: 'Fire Serpent',
    showLabel: true,
  });

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<number>(0);
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  // Validation
  const [validation, setValidation] = useState<{
    sizeOk: boolean;
    aspectOk: boolean;
    dimensionsOk: boolean;
  }>({ sizeOk: false, aspectOk: false, dimensionsOk: false });

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';

    if (!isVideo && !isGif) {
      alert('Please upload a video or GIF file');
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setProject({
      id: crypto.randomUUID(),
      type: isVideo ? 'video' : 'gif',
      status: 'ready',
      progress: 100,
      originalFile: file,
      originalUrl: objectUrl,
    });

    setPreviewUrl(objectUrl);
    setActiveTab(isVideo ? 'trim' : 'optimize');
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle video loaded
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setTrimEnd(Math.min(10, duration));
    }
  }, []);

  // Play/pause video
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

  // Convert video to GIF on backend
  const convertToGif = useCallback(async () => {
    if (!project?.originalFile) return;

    setIsOptimizing(true);
    setOptimizationProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', project.originalFile);
      formData.append('start', trimStart.toString());
      formData.append('duration', (trimEnd - trimStart).toString());
      formData.append('fps', fps.toString());
      formData.append('scale', scale.toString());
      formData.append('target_size', (targetSize * 1024 * 1024).toString());
      formData.append('optimization', optimizationMethod);
      formData.append('skip_frames', skipFrames.toString());

      if (frameSettings.enabled) {
        formData.append('frame_style', frameSettings.style);
        formData.append('frame_color', frameSettings.color);
        formData.append('weapon_name', frameSettings.weaponName);
        formData.append('skin_name', frameSettings.skinName);
        formData.append('show_label', frameSettings.showLabel.toString());
      }

      // Start conversion
      const response = await fetch(`${API_BASE}/api/studio/publish/convert`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

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

      await pollProgress(result.jobId);
    } catch (error) {
      console.error('Conversion error:', error);
      setIsOptimizing(false);
      setProject(prev => prev ? { ...prev, status: 'error', error: String(error) } : null);
    }
  }, [project, trimStart, trimEnd, fps, scale, targetSize, optimizationMethod, skipFrames, frameSettings]);

  // Optimize existing GIF
  const optimizeGif = useCallback(async () => {
    if (!project?.originalFile) return;

    setIsOptimizing(true);
    setOptimizationProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', project.originalFile);
      formData.append('target_size', (targetSize * 1024 * 1024).toString());
      formData.append('optimization', optimizationMethod);
      formData.append('skip_frames', skipFrames.toString());
      formData.append('scale', scale.toString());

      if (frameSettings.enabled) {
        formData.append('frame_style', frameSettings.style);
        formData.append('frame_color', frameSettings.color);
        formData.append('weapon_name', frameSettings.weaponName);
        formData.append('skin_name', frameSettings.skinName);
        formData.append('show_label', frameSettings.showLabel.toString());
      }

      const response = await fetch(`${API_BASE}/api/studio/publish/optimize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Optimization failed');
      }

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
        } else if (status.status === 'error') {
          throw new Error(status.error || 'Processing failed');
        } else {
          setTimeout(() => pollProgress(jobId), 500);
        }
      };

      await pollProgress(result.jobId);
    } catch (error) {
      console.error('Optimization error:', error);
      setIsOptimizing(false);
    }
  }, [project, targetSize, optimizationMethod, skipFrames, scale, frameSettings]);

  // Validate result against Steam Workshop requirements
  const validateResult = useCallback((size: number, width: number, height: number) => {
    const aspectRatio = width / height;
    const targetAspect = 16 / 9;
    const aspectDiff = Math.abs(aspectRatio - targetAspect);

    setValidation({
      sizeOk: size <= STEAM_WORKSHOP_MAX_SIZE,
      aspectOk: aspectDiff < 0.1, // Allow 10% deviation
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
      a.download = `${frameSettings.weaponName}_${frameSettings.skinName}_workshop.gif`.replace(/\s+/g, '_');
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
    if (project?.originalUrl) {
      URL.revokeObjectURL(project.originalUrl);
    }
    setProject(null);
    setPreviewUrl(null);
    setActiveTab('upload');
    setTrimStart(0);
    setTrimEnd(10);
    setVideoDuration(0);
    setOptimizationProgress(0);
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
            <Button
              variant="ghost"
              size="sm"
              onClick={resetProject}
              className="text-white/60 hover:text-white"
            >
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
                accept="video/*,image/gif"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Upload className="w-10 h-10 text-white/40" />
              </div>
              <h3 className="text-lg font-medium mb-2">Upload Video or GIF</h3>
              <p className="text-sm text-white/40 text-center max-w-md">
                Drag and drop your video or GIF here, or click to browse.
                <br />
                Supports MP4, WebM, MOV, AVI, and GIF formats.
              </p>
            </div>
          ) : (
            // Preview area
            <div className="flex-1 flex flex-col">
              {/* Preview display */}
              <div className="flex-1 relative bg-[#121214] rounded-xl overflow-hidden flex items-center justify-center">
                {project.type === 'video' && project.originalUrl && activeTab === 'trim' ? (
                  <video
                    ref={videoRef}
                    src={project.originalUrl}
                    className="max-w-full max-h-full"
                    style={{ transform: `scale(${zoom})` }}
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
                    className="max-w-full max-h-full object-contain"
                    style={{ transform: `scale(${zoom})` }}
                  />
                ) : (
                  <div className="text-white/40">No preview available</div>
                )}

                {/* Processing overlay */}
                {isOptimizing && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                    <p className="text-lg mb-2">Processing...</p>
                    <Progress value={optimizationProgress} className="w-64 h-2" />
                    <p className="text-sm text-white/40 mt-2">{optimizationProgress}%</p>
                  </div>
                )}
              </div>

              {/* Video controls */}
              {project.type === 'video' && activeTab === 'trim' && (
                <div className="mt-4 p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlay}
                      className="text-white"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                    className="text-white/60"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white/60 text-xs min-w-[48px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                    className="text-white/60"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Settings */}
        {project && (
          <div className="w-80 border-l border-white/10 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
              <TabsList className="flex-none mx-4 mt-4 bg-white/5">
                {project.type === 'video' && (
                  <TabsTrigger value="trim" className="flex-1 text-xs">
                    <Scissors className="w-3 h-3 mr-1" />
                    Trim
                  </TabsTrigger>
                )}
                <TabsTrigger value="optimize" className="flex-1 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  Optimize
                </TabsTrigger>
                <TabsTrigger value="frame" className="flex-1 text-xs">
                  <Frame className="w-3 h-3 mr-1" />
                  Frame
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto p-4">
                {/* Trim tab */}
                <TabsContent value="trim" className="m-0 space-y-4">
                  <div>
                    <Label className="text-xs text-white/60">FPS (Frames per second)</Label>
                    <Slider
                      value={[fps]}
                      min={5}
                      max={30}
                      step={1}
                      onValueChange={([v]) => setFps(v)}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-1">
                      <span>5 fps</span>
                      <span className="text-white">{fps} fps</span>
                      <span>30 fps</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-white/60">Scale</Label>
                    <Slider
                      value={[scale]}
                      min={25}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setScale(v)}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-1">
                      <span>25%</span>
                      <span className="text-white">{scale}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <Button
                    onClick={convertToGif}
                    disabled={isOptimizing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isOptimizing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Convert to GIF
                  </Button>
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

                  <div>
                    <Label className="text-xs text-white/60">Scale</Label>
                    <Slider
                      value={[scale]}
                      min={25}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setScale(v)}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-1">
                      <span>25%</span>
                      <span className="text-white">{scale}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <Button
                    onClick={project.type === 'video' ? convertToGif : optimizeGif}
                    disabled={isOptimizing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isOptimizing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    {project.type === 'video' ? 'Convert & Optimize' : 'Optimize GIF'}
                  </Button>

                  {/* Steam Workshop validation */}
                  <div className="p-3 bg-white/5 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Steam Workshop Requirements</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        {validation.sizeOk ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-400" />
                        )}
                        <span className={validation.sizeOk ? 'text-green-400' : 'text-red-400'}>
                          Size ≤ 2 MB
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {validation.aspectOk ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-yellow-400" />
                        )}
                        <span className={validation.aspectOk ? 'text-green-400' : 'text-yellow-400'}>
                          Aspect ratio ~16:9
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {validation.dimensionsOk ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-yellow-400" />
                        )}
                        <span className={validation.dimensionsOk ? 'text-green-400' : 'text-yellow-400'}>
                          Width 512-1920 px
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Frame tab */}
                <TabsContent value="frame" className="m-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-white/60">Add Frame</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFrameSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={frameSettings.enabled ? 'text-purple-400' : 'text-white/40'}
                    >
                      {frameSettings.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  {frameSettings.enabled && (
                    <>
                      <div>
                        <Label className="text-xs text-white/60">Frame Style</Label>
                        <Select
                          value={frameSettings.style}
                          onValueChange={(v) => setFrameSettings(prev => ({ ...prev, style: v as FrameSettings['style'] }))}
                        >
                          <SelectTrigger className="mt-2 bg-white/5 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1c] border-white/10">
                            <SelectItem value="cs2" className="text-white">CS2 Style</SelectItem>
                            <SelectItem value="gradient" className="text-white">Gradient</SelectItem>
                            <SelectItem value="metallic" className="text-white">Metallic</SelectItem>
                            <SelectItem value="neon" className="text-white">Neon Glow</SelectItem>
                            <SelectItem value="minimal" className="text-white">Minimal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-white/60">Frame Color</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            type="color"
                            value={frameSettings.color}
                            onChange={(e) => setFrameSettings(prev => ({ ...prev, color: e.target.value }))}
                            className="w-12 h-10 p-1 bg-white/5 border-white/10"
                          />
                          <Input
                            value={frameSettings.color}
                            onChange={(e) => setFrameSettings(prev => ({ ...prev, color: e.target.value }))}
                            className="flex-1 bg-white/5 border-white/10"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-white/60">Show Label</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFrameSettings(prev => ({ ...prev, showLabel: !prev.showLabel }))}
                          className={frameSettings.showLabel ? 'text-purple-400' : 'text-white/40'}
                        >
                          {frameSettings.showLabel ? 'Yes' : 'No'}
                        </Button>
                      </div>

                      {frameSettings.showLabel && (
                        <>
                          <div>
                            <Label className="text-xs text-white/60">Weapon Name</Label>
                            <Input
                              value={frameSettings.weaponName}
                              onChange={(e) => setFrameSettings(prev => ({ ...prev, weaponName: e.target.value }))}
                              placeholder="AK-47"
                              className="mt-2 bg-white/5 border-white/10"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-white/60">Skin Name</Label>
                            <Input
                              value={frameSettings.skinName}
                              onChange={(e) => setFrameSettings(prev => ({ ...prev, skinName: e.target.value }))}
                              placeholder="Fire Serpent"
                              className="mt-2 bg-white/5 border-white/10"
                            />
                          </div>

                          <div className="p-3 bg-white/5 rounded-lg">
                            <Label className="text-xs text-white/60">Preview</Label>
                            <div className="mt-2 text-center text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                              {frameSettings.weaponName} | {frameSettings.skinName}
                            </div>
                          </div>
                        </>
                      )}

                      <Button
                        onClick={project.type === 'video' ? convertToGif : optimizeGif}
                        disabled={isOptimizing}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {isOptimizing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Frame className="w-4 h-4 mr-2" />
                        )}
                        Apply Frame
                      </Button>
                    </>
                  )}
                </TabsContent>
              </div>

              {/* Download button */}
              {project.resultUrl && (
                <div className="flex-none p-4 border-t border-white/10">
                  <Button
                    onClick={downloadResult}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download GIF
                  </Button>
                  <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>File will be deleted in 1 hour</span>
                  </div>
                </div>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
