'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  FolderPlus,
  Upload,
  File,
  Image,
  Video,
  FileText,
  Trash2,
  Copy,
  Check,
  Lock,
  Unlock,
  ChevronRight,
  Home,
  Loader2,
  MoreVertical,
  Download,
  Eye,
  Edit2,
  X,
  Link2,
  Cloud,
  RefreshCw,
  Monitor,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const API_BASE = '/api';

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  hasAccessCode: boolean;
  url: string;
  createdAt: string;
}

// Helper to get admin file URL (for viewing any file in admin panel)
// Includes token as query param since img/video src can't have headers
const getAdminFileUrl = (fileId: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('studio_token') : null;
  return `${API_BASE}/files/admin/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface FolderContents {
  folder: FolderItem | null;
  folders: FolderItem[];
  files: FileItem[];
  breadcrumbs: FolderItem[];
}

interface SyncClient {
  id: string;
  deviceName: string;
  lastSyncAt: string | null;
  createdAt: string;
}

interface SyncFolder {
  id: string;
  name: string;
  apiKey: string;
  apiUrl: string;
  clientCount: number;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
  clients: SyncClient[];
}

interface SyncFile {
  id: string;
  path: string;
  name: string;
  mimeType: string;
  size: number;
  checksum: string;
  version: number;
  updatedAt: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  return FileText;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function FileManager() {
  const [contents, setContents] = useState<FolderContents | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [editFile, setEditFile] = useState<FileItem | null>(null);

  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadIsPublic, setUploadIsPublic] = useState(false);
  const [uploadAccessCode, setUploadAccessCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editAccessCode, setEditAccessCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cloud Sync states
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncFolders, setSyncFolders] = useState<SyncFolder[]>([]);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [newSyncFolderName, setNewSyncFolderName] = useState('');
  const [isCreatingSyncFolder, setIsCreatingSyncFolder] = useState(false);
  const [copiedSyncKey, setCopiedSyncKey] = useState<string | null>(null);
  const [expandedSyncFolder, setExpandedSyncFolder] = useState<string | null>(null);
  const [viewingSyncFolder, setViewingSyncFolder] = useState<SyncFolder | null>(null);
  const [syncFolderFiles, setSyncFolderFiles] = useState<SyncFile[]>([]);
  const [isSyncFolderFilesLoading, setIsSyncFolderFilesLoading] = useState(false);

  const getToken = () => localStorage.getItem('studio_token');

  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      const url = currentFolderId
        ? `${API_BASE}/files/folders?folder_id=${currentFolderId}`
        : `${API_BASE}/files/folders`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
        } else {
          setError('Failed to load files');
        }
        return;
      }

      const data = await response.json();
      if (data.success) {
        setContents(data.data);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE}/files/folders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
        }),
      });

      if (response.ok) {
        setCreateFolderOpen(false);
        setNewFolderName('');
        loadContents();
      }
    } catch {
      setError('Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    const token = getToken();

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }
      formData.append('isPublic', uploadIsPublic.toString());
      if (uploadAccessCode && !uploadIsPublic) {
        formData.append('accessCode', uploadAccessCode);
      }

      const response = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        setUploadOpen(false);
        setUploadFile(null);
        setUploadIsPublic(false);
        setUploadAccessCode('');
        loadContents();
      }
    } catch {
      setError('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const token = getToken();
    const endpoint = deleteConfirm.type === 'folder'
      ? `${API_BASE}/files/folders/${deleteConfirm.id}`
      : `${API_BASE}/files/${deleteConfirm.id}`;

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        loadContents();
      }
    } catch {
      setError(`Failed to delete ${deleteConfirm.type}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleUpdateFile = async () => {
    if (!editFile) return;

    setIsSaving(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE}/files/${editFile.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName || undefined,
          isPublic: editIsPublic,
          accessCode: editAccessCode || undefined,
        }),
      });

      if (response.ok) {
        setEditFile(null);
        loadContents();
      }
    } catch {
      setError('Failed to update file');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (file: FileItem) => {
    const url = window.location.origin + file.url;
    await navigator.clipboard.writeText(url);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditDialog = (file: FileItem) => {
    setEditFile(file);
    setEditName(file.name);
    setEditIsPublic(file.isPublic);
    setEditAccessCode('');
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Cloud Sync functions
  const loadSyncFolders = async () => {
    setIsSyncLoading(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE}/sync/folders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSyncFolders(data.data.folders);
        }
      }
    } catch (err) {
      console.error('Failed to load sync folders:', err);
    } finally {
      setIsSyncLoading(false);
    }
  };

  const handleCreateSyncFolder = async () => {
    if (!newSyncFolderName.trim()) return;

    setIsCreatingSyncFolder(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE}/sync/folders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newSyncFolderName.trim() }),
      });

      if (response.ok) {
        setNewSyncFolderName('');
        loadSyncFolders();
      }
    } catch (err) {
      console.error('Failed to create sync folder:', err);
    } finally {
      setIsCreatingSyncFolder(false);
    }
  };

  const handleDeleteSyncFolder = async (folderId: string) => {
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE}/sync/folders/${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        loadSyncFolders();
      }
    } catch (err) {
      console.error('Failed to delete sync folder:', err);
    }
  };

  const handleRegenerateSyncKey = async (folderId: string) => {
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE}/sync/folders/${folderId}/regenerate-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        loadSyncFolders();
      }
    } catch (err) {
      console.error('Failed to regenerate key:', err);
    }
  };

  const copySyncToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSyncKey(id);
    setTimeout(() => setCopiedSyncKey(null), 2000);
  };

  const formatSyncSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load sync folder files
  const loadSyncFolderFiles = async (folder: SyncFolder) => {
    setIsSyncFolderFilesLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sync/files`, {
        headers: { 'X-API-Key': folder.apiKey },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSyncFolderFiles(data.data.files || []);
        }
      }
    } catch (err) {
      console.error('Failed to load sync folder files:', err);
    } finally {
      setIsSyncFolderFilesLoading(false);
    }
  };

  const openSyncFolder = (folder: SyncFolder) => {
    setViewingSyncFolder(folder);
    loadSyncFolderFiles(folder);
  };

  const closeSyncFolderView = () => {
    setViewingSyncFolder(null);
    setSyncFolderFiles([]);
  };

  const getSyncFileUrl = (folder: SyncFolder, fileId: string) => {
    // For sync files, we need to use the download endpoint with API key
    return `${API_BASE}/sync/download/${fileId}`;
  };

  // Load sync folders when dialog opens
  useEffect(() => {
    if (syncDialogOpen) {
      loadSyncFolders();
    }
  }, [syncDialogOpen]);

  // Load sync folders on mount for display in file manager
  useEffect(() => {
    loadSyncFolders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-red-400">{error}</div>
        <Button onClick={loadContents} variant="outline" className="text-white border-white/20">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          {/* Breadcrumbs */}
          <button
            onClick={() => navigateToFolder(null)}
            className="flex items-center gap-1 px-2 py-1 text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">Files</span>
          </button>
          {contents?.breadcrumbs.map((crumb) => (
            <div key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-white/30" />
              <button
                onClick={() => navigateToFolder(crumb.id)}
                className="px-2 py-1 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setSyncDialogOpen(true)}
            variant="outline"
            size="sm"
            className="text-white border-white/20 hover:bg-white/10"
          >
            <Cloud className="w-4 h-4 mr-2" />
            Cloud Sync
          </Button>
          <Button
            onClick={() => setCreateFolderOpen(true)}
            variant="outline"
            size="sm"
            className="text-white border-white/20 hover:bg-white/10"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button
            onClick={() => setUploadOpen(true)}
            size="sm"
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Viewing Sync Folder Contents */}
        {viewingSyncFolder ? (
          <div className="space-y-4">
            {/* Sync folder header */}
            <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <button
                onClick={closeSyncFolderView}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white/60 rotate-180" />
              </button>
              <Cloud className="w-6 h-6 text-purple-400" />
              <div className="flex-1">
                <p className="font-medium text-white">{viewingSyncFolder.name}</p>
                <p className="text-xs text-white/40">
                  {viewingSyncFolder.fileCount} files • {formatSyncSize(viewingSyncFolder.totalSize)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSyncDialogOpen(true);
                  setExpandedSyncFolder(viewingSyncFolder.id);
                }}
                className="text-white/60 hover:text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Credentials
              </Button>
            </div>

            {/* Sync folder files */}
            {isSyncFolderFilesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : syncFolderFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Cloud className="w-16 h-16 text-white/20 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No synced files</h3>
                <p className="text-white/40">Files will appear here when synced from your computer</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {syncFolderFiles.map((file, index) => {
                  const FileIcon = getFileIcon(file.mimeType);
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group relative bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all"
                    >
                      <div className="aspect-square bg-[#121214] flex items-center justify-center">
                        <FileIcon className="w-12 h-12 text-white/20" />
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Cloud className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-white truncate flex-1">
                            {file.name}
                          </span>
                        </div>
                        <span className="text-xs text-white/40">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : contents && contents.folders.length === 0 && contents.files.length === 0 && syncFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Folder className="w-16 h-16 text-white/20 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Empty folder</h3>
            <p className="text-white/40 mb-4">Upload files or create folders to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Sync Folders (only at root) */}
            <AnimatePresence mode="popLayout">
              {currentFolderId === null && syncFolders.map((folder, index) => (
                <motion.div
                  key={`sync-${folder.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                  className="group relative bg-purple-500/10 rounded-xl p-4 border border-purple-500/30 hover:border-purple-500/60 cursor-pointer transition-all"
                  onDoubleClick={() => openSyncFolder(folder)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <Folder className="w-12 h-12 text-purple-400" />
                      <Cloud className="w-5 h-5 text-purple-300 absolute -bottom-1 -right-1 bg-[#1a1a1c] rounded-full p-0.5" />
                    </div>
                    <span className="text-sm text-white truncate w-full text-center">
                      {folder.name}
                    </span>
                    <span className="text-xs text-purple-300/60">
                      {folder.fileCount} synced
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-white/60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a1c] border-white/10">
                      <DropdownMenuItem
                        onClick={() => openSyncFolder(folder)}
                        className="text-white hover:bg-white/10 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Files
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSyncDialogOpen(true);
                          setExpandedSyncFolder(folder.id);
                        }}
                        className="text-white hover:bg-white/10 cursor-pointer"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Credentials
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={() => handleDeleteSyncFolder(folder.id)}
                        className="text-red-400 hover:bg-white/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ))}

              {/* Regular Folders */}
              {contents?.folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: (currentFolderId === null ? syncFolders.length : 0 + index) * 0.03 }}
                  className="group relative bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all"
                  onDoubleClick={() => navigateToFolder(folder.id)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Folder className="w-12 h-12 text-purple-400" />
                    <span className="text-sm text-white truncate w-full text-center">
                      {folder.name}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-white/60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a1c] border-white/10">
                      <DropdownMenuItem
                        onClick={() => navigateToFolder(folder.id)}
                        className="text-white hover:bg-white/10 cursor-pointer"
                      >
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm({ type: 'folder', id: folder.id, name: folder.name })}
                        className="text-red-400 hover:bg-white/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ))}

              {/* Files */}
              {contents?.files.map((file, index) => {
                const FileIcon = getFileIcon(file.mimeType);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: (contents.folders.length + index) * 0.03 }}
                    className="group relative bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all"
                    onClick={() => setPreviewFile(file)}
                  >
                    {/* Preview */}
                    <div className="aspect-square bg-[#121214] flex items-center justify-center">
                      {file.mimeType.startsWith('image/') ? (
                        <img
                          src={getAdminFileUrl(file.id)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <FileIcon className="w-12 h-12 text-white/20" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {file.isPublic ? (
                          <Unlock className="w-3 h-3 text-green-400" />
                        ) : (
                          <Lock className="w-3 h-3 text-orange-400" />
                        )}
                        <span className="text-xs text-white truncate flex-1">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs text-white/40">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2 right-2 p-1 rounded bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a1c] border-white/10">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        {file.isPublic && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(file);
                            }}
                            className="text-white hover:bg-white/10 cursor-pointer"
                          >
                            {copiedId === file.id ? (
                              <Check className="w-4 h-4 mr-2 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            Copy Link
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getAdminFileUrl(file.id), '_blank');
                          }}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(file);
                          }}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ type: 'file', id: file.id, name: file.name });
                          }}
                          className="text-red-400 hover:bg-white/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription className="text-white/60">
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateFolderOpen(false)}
              className="text-white/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isCreating}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription className="text-white/60">
              Choose a file and configure access settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>File</Label>
              <div className="mt-2">
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    {uploadFile ? (
                      <>
                        <File className="w-8 h-8 text-purple-400" />
                        <span className="text-sm text-white">{uploadFile.name}</span>
                        <span className="text-xs text-white/40">{formatFileSize(uploadFile.size)}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-white/40" />
                        <span className="text-sm text-white/40">Click to select a file</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Public Access</Label>
                <p className="text-xs text-white/40">Anyone with the link can view</p>
              </div>
              <Switch
                checked={uploadIsPublic}
                onCheckedChange={setUploadIsPublic}
              />
            </div>

            {!uploadIsPublic && (
              <div>
                <Label>Access Code (optional)</Label>
                <Input
                  type="password"
                  placeholder="Enter access code"
                  value={uploadAccessCode}
                  onChange={(e) => setUploadAccessCode(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-white/40 mt-1">
                  Required to view the file if not public
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setUploadOpen(false);
                setUploadFile(null);
              }}
              className="text-white/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || isUploading}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit File Dialog */}
      <Dialog open={!!editFile} onOpenChange={(open) => !open && setEditFile(null)}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit File</DialogTitle>
            <DialogDescription className="text-white/60">
              Update file settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>File Name</Label>
              <Input
                placeholder="File name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Public Access</Label>
                <p className="text-xs text-white/40">Anyone with the link can view</p>
              </div>
              <Switch
                checked={editIsPublic}
                onCheckedChange={setEditIsPublic}
              />
            </div>

            {!editIsPublic && (
              <div>
                <Label>New Access Code (optional)</Label>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={editAccessCode}
                  onChange={(e) => setEditAccessCode(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white"
                />
              </div>
            )}

            {editFile?.isPublic && (
              <div className="p-3 bg-white/5 rounded-lg">
                <Label className="text-sm">Public URL</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-xs text-purple-400 bg-black/30 p-2 rounded overflow-x-auto">
                    {window.location.origin}{editFile.url}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => editFile && copyToClipboard(editFile)}
                  >
                    {copiedId === editFile?.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditFile(null)}
              className="text-white/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFile}
              disabled={isSaving}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile?.isPublic ? (
                <Unlock className="w-4 h-4 text-green-400" />
              ) : (
                <Lock className="w-4 h-4 text-orange-400" />
              )}
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {previewFile?.mimeType.startsWith('image/') ? (
              <img
                src={getAdminFileUrl(previewFile.id)}
                alt={previewFile.name}
                className="max-w-full max-h-[60vh] mx-auto rounded-lg"
              />
            ) : previewFile?.mimeType.startsWith('video/') ? (
              <video
                src={getAdminFileUrl(previewFile.id)}
                controls
                className="max-w-full max-h-[60vh] mx-auto rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-white/20 mb-4" />
                <p className="text-white/40">Preview not available</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="text-sm text-white/40">
              {previewFile && formatFileSize(previewFile.size)}
            </div>
            <div className="flex items-center gap-2">
              {previewFile?.isPublic && (
                <Button
                  variant="outline"
                  onClick={() => previewFile && copyToClipboard(previewFile)}
                  className="text-white border-white/20"
                >
                  {copiedId === previewFile?.id ? (
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Copy Link
                </Button>
              )}
              <Button
                onClick={() => previewFile && window.open(getAdminFileUrl(previewFile.id), '_blank')}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-[#1a1a1c] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {deleteConfirm?.type === 'folder'
                ? 'This will delete the folder and all its contents. This action cannot be undone.'
                : `Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cloud Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-purple-400" />
              Cloud Sync
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Create sync folders and use the client app to sync files between your computer and the cloud
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Create new sync folder */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New sync folder name..."
                value={newSyncFolderName}
                onChange={(e) => setNewSyncFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSyncFolder()}
                className="bg-white/5 border-white/10 text-white"
              />
              <Button
                onClick={handleCreateSyncFolder}
                disabled={!newSyncFolderName.trim() || isCreatingSyncFolder}
                className="bg-purple-500 hover:bg-purple-600 text-white shrink-0"
              >
                {isCreatingSyncFolder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Loading state */}
            {isSyncLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : syncFolders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Cloud className="w-12 h-12 text-white/20 mb-3" />
                <p className="text-white/40">No sync folders yet</p>
                <p className="text-sm text-white/30">Create one to start syncing files</p>
              </div>
            ) : (
              <div className="space-y-3">
                {syncFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                  >
                    {/* Folder header */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
                      onClick={() => setExpandedSyncFolder(
                        expandedSyncFolder === folder.id ? null : folder.id
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          className={`w-4 h-4 text-white/40 transition-transform ${
                            expandedSyncFolder === folder.id ? 'rotate-90' : ''
                          }`}
                        />
                        <Cloud className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="font-medium text-white">{folder.name}</p>
                          <p className="text-xs text-white/40">
                            {folder.fileCount} files • {formatSyncSize(folder.totalSize)} • {folder.clientCount} devices
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerateSyncKey(folder.id);
                          }}
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSyncFolder(folder.id);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedSyncFolder === folder.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/10"
                        >
                          <div className="p-3 space-y-3">
                            {/* API URL */}
                            <div>
                              <Label className="text-xs text-white/40">API URL</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-black/30 rounded text-xs font-mono text-purple-400 truncate">
                                  {window.location.origin}{folder.apiUrl}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copySyncToClipboard(
                                    `${window.location.origin}${folder.apiUrl}`,
                                    `url-${folder.id}`
                                  )}
                                  className="shrink-0"
                                >
                                  {copiedSyncKey === `url-${folder.id}` ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-white/60" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* API Key */}
                            <div>
                              <Label className="text-xs text-white/40">API Key</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-black/30 rounded text-xs font-mono text-purple-400 truncate">
                                  {folder.apiKey}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copySyncToClipboard(folder.apiKey, `key-${folder.id}`)}
                                  className="shrink-0"
                                >
                                  {copiedSyncKey === `key-${folder.id}` ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-white/60" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Connected devices */}
                            {folder.clients.length > 0 && (
                              <div>
                                <Label className="text-xs text-white/40">Connected Devices</Label>
                                <div className="mt-2 space-y-2">
                                  {folder.clients.map((client) => (
                                    <div
                                      key={client.id}
                                      className="flex items-center justify-between p-2 bg-black/20 rounded"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Monitor className="w-4 h-4 text-white/40" />
                                        <div>
                                          <p className="text-sm text-white">{client.deviceName}</p>
                                          <p className="text-xs text-white/40">
                                            {client.lastSyncAt
                                              ? `Last sync: ${new Date(client.lastSyncAt).toLocaleString()}`
                                              : 'Never synced'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Download client hint */}
                            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                              <p className="text-sm text-white">
                                <strong>How to sync:</strong>
                              </p>
                              <ol className="text-xs text-white/60 mt-2 space-y-1 list-decimal list-inside">
                                <li>Download and run the sync client app</li>
                                <li>Enter the API URL and API Key above</li>
                                <li>Select a local folder to sync</li>
                                <li>Files will sync automatically</li>
                              </ol>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSyncDialogOpen(false)}
              className="text-white/60"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
