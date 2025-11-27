'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  FolderOpen,
  Trash2,
  Clock,
  Loader2,
  LogOut,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { useStudioAuth } from '@/hooks/useStudioAuth';
import { StudioProject, StickerType } from '@/types/studio';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const stickerTypes: { value: StickerType; label: string; description: string }[] = [
  { value: 'paper', label: 'Paper', description: 'Classic paper sticker' },
  { value: 'glitter', label: 'Glitter', description: 'Sparkling glitter effect' },
  { value: 'holo', label: 'Holographic', description: 'Rainbow holographic effect' },
  { value: 'foil', label: 'Foil', description: 'Metallic foil finish' },
  { value: 'gold', label: 'Gold', description: 'Premium gold variant' },
  { value: 'lenticular', label: 'Lenticular', description: 'Animated/moving effect' },
  { value: 'champion', label: 'Champion', description: 'Champion autograph style' },
];

export default function StudioPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    projects,
    loadProjects,
    createProject,
    deleteProject,
  } = useStudioAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<StickerType>('paper');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated, loadProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const project = await createProject(newProjectName, 'sticker', newProjectType);
      setIsCreateOpen(false);
      setNewProjectName('');
      router.push(`/studio/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const openProject = (id: string) => {
    router.push(`/studio/project/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-white/60">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-8 p-8"
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <motion.div
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/20"
              whileHover={{ scale: 1.05, rotate: 2 }}
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white">CS2 Skin Studio</h1>
            <p className="text-white/60 text-center max-w-md">
              Professional tool for creating stickers and skins for Counter-Strike 2.
              Design, paint, and export your creations.
            </p>
          </div>

          {/* Steam Login */}
          <motion.button
            onClick={login}
            className="relative flex items-center gap-5 px-10 py-5 bg-gradient-to-br from-[#171a21] via-[#1b2838] to-[#2a475e] rounded-2xl transition-all shadow-2xl shadow-black/50 border border-[#66c0f4]/30 group overflow-hidden"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#66c0f4]/0 via-[#66c0f4]/10 to-[#66c0f4]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            {/* Steam Logo SVG */}
            <svg
              className="w-10 h-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg z-10"
              viewBox="0 0 256 259"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M127.8 0C60.4 0 5.2 52.4 0 119l68.7 28.7c5.7-4 12.6-6.4 20.4-6.4.7 0 1.4 0 2 .1l30.6-44.7v-.6c0-26.9 21.7-48.8 48.4-48.8 26.7 0 48.4 21.9 48.4 48.8 0 27-21.7 48.9-48.4 48.9h-.6l-43.8 31.6c0 .5 0 1.1 0 1.6 0 20.2-16.3 36.6-36.3 36.6-17.6 0-32.3-12.6-35.6-29.3L1.5 163.1C17.9 218.2 68.5 258.8 127.8 258.8c71.2 0 128.9-58.2 128.9-130S199 0 127.8 0"
                fill="#ffffff"
              />
              <path
                d="M80.4 214.3l-15.6-6.5c2.8 5.8 7.4 10.6 13.6 13.3 13.3 5.8 28.7-.3 34.4-13.5 2.8-6.4 2.8-13.5 0-19.9-2.7-6.4-7.9-11.4-14.5-14a26.8 26.8 0 00-14.1-1.5l16.1 6.7c9.8 4.2 14.4 15.4 10.3 25.2-4.1 9.7-15.3 14.5-25.1 10.3l-.1-.1zm121.9-70.2c0-17.9-14.4-32.5-32.3-32.5-17.8 0-32.3 14.6-32.3 32.5s14.5 32.5 32.3 32.5c17.9 0 32.3-14.6 32.3-32.5zm-56.4 0c0-13.5 10.8-24.4 24.1-24.4 13.3 0 24.1 10.9 24.1 24.4 0 13.4-10.8 24.4-24.1 24.4-13.3 0-24.1-11-24.1-24.4z"
                fill="#ffffff"
              />
            </svg>

            <div className="flex flex-col items-start z-10">
              <span className="text-white font-bold text-xl tracking-wide">
                Sign in with Steam
              </span>
              <span className="text-[#66c0f4]/80 text-sm font-medium">
                Secure • Fast • Easy
              </span>
            </div>

            {/* Arrow indicator */}
            <div className="ml-auto pl-4 z-10">
              <div className="w-10 h-10 rounded-full bg-[#66c0f4]/20 flex items-center justify-center group-hover:bg-[#66c0f4]/30 transition-colors">
                <svg
                  className="w-5 h-5 text-[#66c0f4] group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>

          {/* Back to site */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to main site
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  CS2 Skin Studio
                </h1>
                <p className="text-xs text-white/40">Your Projects</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg">
              {user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.personaName}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-white text-sm">{user?.personaName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/60 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Projects</h2>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        <AnimatePresence mode="popLayout">
          {projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <FolderOpen className="w-12 h-12 text-white/20" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">
                No projects yet
              </h3>
              <p className="text-white/40 mb-6 max-w-md">
                Create your first project to start designing stickers for CS2.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.filter(Boolean).map((project, index) => (
                project && (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer"
                  onClick={() => openProject(project.id)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-[#121214] flex items-center justify-center">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name || 'Project'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-white/5 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-medium truncate">
                      {project.name || 'Untitled Project'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
                      <span className="px-2 py-0.5 bg-white/10 rounded capitalize">
                        {project.stickerType || 'sticker'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(project.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </motion.div>
                )
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription className="text-white/60">
              Set up your new sticker project for CS2.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Sticker"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Sticker Type</Label>
              <Select
                value={newProjectType}
                onValueChange={(v) => setNewProjectType(v as StickerType)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1c] border-white/10">
                  {stickerTypes.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      className="text-white hover:bg-white/10"
                    >
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-white/40">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="text-white/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || isCreating}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent className="bg-[#1a1a1c] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This action cannot be undone. The project and all its data will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteProject(deleteConfirm)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
