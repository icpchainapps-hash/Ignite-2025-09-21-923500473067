import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Image, Crown, Trophy, ArrowLeft, Search, Filter, Camera, Heart, MessageCircle, Eye, Users, CheckCircle, AlertCircle, Loader2, RefreshCw, File, FileText, Download, Upload, Plus, Folder, Edit3, Trash2, ChevronRight, Home } from 'lucide-react';
import { useGetVaultFolders, useGetFolderPhotos, useGetFolderFiles, useGetSubfoldersByParent, useCreateSubfolder, useDeleteSubfolder, useUploadPhoto, useUploadFile } from '../hooks/useVault';
import { useUserRoles } from '../hooks/useRoles';
import { useFileUrl } from '../blob-storage/FileStorage';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import type { Photo, PhotoReaction, PhotoComment, File as FileType, Subfolder, ParentType } from '../backend';

interface VaultModalProps {
  onClose: () => void;
}

interface VaultFolder {
  id: string;
  name: string;
  type: 'club' | 'team';
  photoCount: number;
  fileCount: number;
  subfolderCount: number;
}

interface EnhancedPhoto extends Photo {
  organizationName?: string;
  organizationType?: 'club' | 'team';
}

interface EnhancedFile extends FileType {
  organizationName?: string;
  organizationType?: 'club' | 'team';
  fileName?: string;
  fileExtension?: string;
}

interface EnhancedPhotoComment extends PhotoComment {
  senderName: string;
  formattedTime: string;
}

interface CommentReaction {
  id: string;
  commentId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'root' | 'folder' | 'subfolder';
}

// Helper function to format photo timestamps
const formatPhotoTime = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp / BigInt(1000000)));
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to get file extension and name
const getFileInfo = (filePath: string) => {
  const fileName = filePath.split('/').pop() || 'Unknown File';
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  return { fileName, fileExtension };
};

// Helper function to get file type icon
const getFileTypeIcon = (extension: string) => {
  switch (extension) {
    case 'pdf':
      return <FileText className="w-6 h-6 text-red-400" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-6 h-6 text-blue-400" />;
    case 'xls':
    case 'xlsx':
      return <FileText className="w-6 h-6 text-green-400" />;
    case 'ppt':
    case 'pptx':
      return <FileText className="w-6 h-6 text-orange-400" />;
    case 'txt':
      return <FileText className="w-6 h-6 text-slate-400" />;
    case 'mp4':
    case 'mov':
    case 'avi':
      return <FileText className="w-6 h-6 text-purple-400" />;
    case 'mp3':
    case 'wav':
      return <FileText className="w-6 h-6 text-pink-400" />;
    default:
      return <File className="w-6 h-6 text-slate-400" />;
  }
};

export default function VaultModal({ onClose }: VaultModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<VaultFolder | null>(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState<Subfolder | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<EnhancedPhoto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'club' | 'team'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateSubfolderModal, setShowCreateSubfolderModal] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Vault', type: 'root' }]);

  const { data: folders, isLoading: foldersLoading, error: foldersError } = useGetVaultFolders();
  const { canAccessVaultFolder, canCreateSubfolder } = useUserRoles();

  useEffect(() => {
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.top = '0';
    document.body.style.left = '0';
    
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
    };
  }, []);

  // Filter folders based on access permissions
  const accessibleFolders = (folders || []).filter(folder => canAccessVaultFolder(folder.id));

  // Filter folders based on search and type
  const filteredFolders = accessibleFolders.filter(folder => {
    const matchesSearch = !searchQuery || 
      folder.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || folder.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleFolderSelect = (folder: VaultFolder) => {
    setSelectedFolder(folder);
    setBreadcrumbs([
      { id: 'root', name: 'Vault', type: 'root' },
      { id: folder.id, name: folder.name, type: 'folder' }
    ]);
  };

  const handleSubfolderSelect = (subfolder: Subfolder) => {
    setSelectedSubfolder(subfolder);
    setBreadcrumbs(prev => [
      ...prev,
      { id: subfolder.id.toString(), name: subfolder.name, type: 'subfolder' }
    ]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const clickedItem = breadcrumbs[index];
    
    if (clickedItem.type === 'root') {
      setSelectedFolder(null);
      setSelectedSubfolder(null);
      setBreadcrumbs([{ id: 'root', name: 'Vault', type: 'root' }]);
    } else if (clickedItem.type === 'folder') {
      setSelectedSubfolder(null);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setSelectedSubfolder(null);
    setSelectedPhoto(null);
    setBreadcrumbs([{ id: 'root', name: 'Vault', type: 'root' }]);
  };

  const handlePhotoSelect = (photo: Photo) => {
    const enhancedPhoto: EnhancedPhoto = {
      ...photo,
      organizationName: selectedFolder?.name,
      organizationType: selectedFolder?.type,
    };
    setSelectedPhoto(enhancedPhoto);
  };

  const clubFolders = accessibleFolders.filter(f => f.type === 'club');
  const teamFolders = accessibleFolders.filter(f => f.type === 'team');
  const totalPhotos = accessibleFolders.reduce((sum, folder) => sum + folder.photoCount, 0);
  const totalFiles = accessibleFolders.reduce((sum, folder) => sum + folder.fileCount, 0);
  const totalSubfolders = accessibleFolders.reduce((sum, folder) => sum + folder.subfolderCount, 0);

  if (selectedPhoto) {
    return (
      <PhotoDetailModal 
        photo={selectedPhoto} 
        onClose={() => setSelectedPhoto(null)}
        onBack={() => setSelectedPhoto(null)}
      />
    );
  }

  if (selectedFolder) {
    return (
      <FolderDetailModal
        folder={selectedFolder}
        selectedSubfolder={selectedSubfolder}
        onClose={onClose}
        onBack={handleBackToFolders}
        onPhotoSelect={handlePhotoSelect}
        onSubfolderSelect={handleSubfolderSelect}
        onBreadcrumbClick={handleBreadcrumbClick}
        breadcrumbs={breadcrumbs}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Vault</h1>
          <p className="text-sm text-slate-400">Organized files by clubs and teams</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="p-2 -mr-2 text-emerald-400 hover:text-emerald-300 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          title="Upload File"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {foldersError && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm font-medium">
            {foldersError instanceof Error ? foldersError.message : 'Failed to load vault folders'}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {/* Search and Filter */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search folders by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-mobile pl-10"
              />
            </div>

            <div className="flex bg-slate-800 rounded-lg p-1 overflow-x-auto">
              {[
                { id: 'all', label: 'All Folders' },
                { id: 'club', label: 'Club Folders' },
                { id: 'team', label: 'Team Folders' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilterType(id as any)}
                  className={`py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    filterType === id
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Stats with Subfolders */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center mb-2">
                <FolderOpen className="w-5 h-5 text-emerald-500 mr-2" />
                <span className="text-white font-semibold text-sm">Folders</span>
              </div>
              <p className="text-xl font-bold text-white">{accessibleFolders.length}</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center mb-2">
                <Folder className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-white font-semibold text-sm">Subfolders</span>
              </div>
              <p className="text-xl font-bold text-white">{totalSubfolders}</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center mb-2">
                <Image className="w-5 h-5 text-purple-500 mr-2" />
                <span className="text-white font-semibold text-sm">Images</span>
              </div>
              <p className="text-xl font-bold text-white">{totalPhotos}</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center mb-2">
                <File className="w-5 h-5 text-orange-500 mr-2" />
                <span className="text-white font-semibold text-sm">Files</span>
              </div>
              <p className="text-xl font-bold text-white">{totalFiles}</p>
            </div>
          </div>

          {/* Enhanced Vault Info with Subfolder Support */}
          <div className="card p-4 bg-blue-500/10 border-blue-500/20 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100 mb-2">Enhanced File Vault with Subfolder Management</h4>
                <div className="text-slate-300 text-sm space-y-1">
                  <p>✅ Files automatically organized by club and team</p>
                  <p>✅ Support for images and all file types (documents, videos, etc.)</p>
                  <p>✅ Switch between viewing images and other files within each folder</p>
                  <p>✅ Subfolder creation and management for team and club admins</p>
                  <p>✅ Hierarchical organization with breadcrumb navigation</p>
                  <p>✅ Access only folders for organizations you belong to</p>
                  <p>✅ Secure folder-based permissions with subfolder inheritance</p>
                  <p>✅ Total content: {totalPhotos} images, {totalFiles} files, {totalSubfolders} subfolders</p>
                </div>
              </div>
            </div>
          </div>

          {/* Folders List */}
          {foldersLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">
                {searchQuery || filterType !== 'all' ? 'No Folders Found' : 'No File Folders'}
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create clubs and teams to start organizing your files in the vault.'
                }
              </p>
              {!searchQuery && filterType === 'all' && (
                <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-emerald-400 font-medium">How the Vault Works</p>
                      <p className="text-emerald-300 text-sm">
                        When you upload files to clubs or teams, they're automatically organized into folders here. 
                        Team and club admins can create subfolders for better organization.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">Your File Folders</h2>
                <p className="text-slate-400 text-sm">
                  {filteredFolders.length} folder{filteredFolders.length !== 1 ? 's' : ''} accessible
                </p>
              </div>

              <div className="space-y-3">
                {filteredFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderSelect(folder)}
                    className="w-full card p-4 text-left hover:bg-slate-800/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          folder.type === 'club' 
                            ? 'bg-blue-500/20' 
                            : 'bg-purple-500/20'
                        }`}>
                          {folder.type === 'club' ? (
                            <Crown className="w-6 h-6 text-blue-400" />
                          ) : (
                            <Trophy className="w-6 h-6 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                            {folder.name}
                          </h4>
                          <div className="flex items-center space-x-4 text-slate-400 text-sm">
                            <div className="flex items-center space-x-1">
                              <Image className="w-4 h-4" />
                              <span>{folder.photoCount} image{folder.photoCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <File className="w-4 h-4" />
                              <span>{folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Folder className="w-4 h-4" />
                              <span>{folder.subfolderCount} subfolder{folder.subfolderCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                              folder.type === 'club' 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}>
                              {folder.type === 'club' ? (
                                <Crown className="w-3 h-3" />
                              ) : (
                                <Trophy className="w-3 h-3" />
                              )}
                              <span>{folder.type === 'club' ? 'Club' : 'Team'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-slate-400 group-hover:text-emerald-400 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Access Control Info with Subfolder Management */}
          <div className="mt-8 card p-6 bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100 mb-2">Enhanced Vault Features with Subfolder Management</h4>
                <div className="text-slate-300 text-sm space-y-2">
                  <p>The Vault now supports all file types with organized access and subfolder management:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                    <li><strong>Images:</strong> Photos, screenshots, graphics (JPG, PNG, GIF, etc.)</li>
                    <li><strong>Documents:</strong> PDFs, Word docs, spreadsheets, presentations</li>
                    <li><strong>Media Files:</strong> Videos, audio files, and other multimedia content</li>
                    <li><strong>File Type Switching:</strong> Toggle between images and other files within each folder</li>
                    <li><strong>Subfolder Management:</strong> Team and club admins can create subfolders for better organization</li>
                    <li><strong>Hierarchical Navigation:</strong> Browse into subfolders with breadcrumb navigation</li>
                    <li><strong>Permission Inheritance:</strong> Subfolders inherit permissions from parent club or team</li>
                    <li><strong>Admin Controls:</strong> Only team/club admins can create and manage subfolders</li>
                    <li><strong>Club Folders:</strong> Only accessible to club members and admins</li>
                    <li><strong>Team Folders:</strong> Only accessible to team members and admins</li>
                    <li><strong>Automatic Organization:</strong> Files are sorted into folders and subfolders when uploaded</li>
                    <li><strong>Permission-Based:</strong> You only see folders for organizations you belong to</li>
                    <li><strong>Secure Storage:</strong> All files are stored with proper access controls</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <button
          onClick={onClose}
          className="w-full btn-primary-mobile"
        >
          Close Vault
        </button>
      </div>

      {showUploadModal && (
        <FileUploadModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
}

interface FolderDetailModalProps {
  folder: VaultFolder;
  selectedSubfolder: Subfolder | null;
  onClose: () => void;
  onBack: () => void;
  onPhotoSelect: (photo: Photo) => void;
  onSubfolderSelect: (subfolder: Subfolder) => void;
  onBreadcrumbClick: (index: number) => void;
  breadcrumbs: BreadcrumbItem[];
}

function FolderDetailModal({ 
  folder, 
  selectedSubfolder, 
  onClose, 
  onBack, 
  onPhotoSelect, 
  onSubfolderSelect, 
  onBreadcrumbClick, 
  breadcrumbs 
}: FolderDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeView, setFileTypeView] = useState<'images' | 'files'>('images');
  const [showCreateSubfolderModal, setShowCreateSubfolderModal] = useState(false);
  const [showDeleteSubfolderConfirm, setShowDeleteSubfolderConfirm] = useState<Subfolder | null>(null);
  
  const { mutate: getFolderPhotos, data: photos, isPending: photosLoading } = useGetFolderPhotos();
  const { mutate: getFolderFiles, data: files, isPending: filesLoading } = useGetFolderFiles();
  const { mutate: getSubfolders, data: subfolders, isPending: subfoldersLoading } = useGetSubfoldersByParent();
  const { mutate: deleteSubfolder, isPending: deletingSubfolder } = useDeleteSubfolder();
  const { canCreateSubfolder, canDeleteSubfolder } = useUserRoles();

  // Determine if user can manage subfolders
  const canManageSubfolders = selectedSubfolder ? false : (
    folder.type === 'club' 
      ? canCreateSubfolder('club', folder.id.replace('club_', ''))
      : canCreateSubfolder('team', folder.id.replace('team_', ''))
  );

  useEffect(() => {
    // Load both images and files when folder is selected
    const folderId = selectedSubfolder ? `subfolder_${selectedSubfolder.id.toString()}` : folder.id;
    getFolderPhotos(folderId);
    getFolderFiles(folderId);
    
    // Load subfolders if not in a subfolder
    if (!selectedSubfolder) {
      const parentType: ParentType = folder.type === 'club' 
        ? { __kind__: 'club', club: BigInt(folder.id.replace('club_', '')) }
        : { __kind__: 'team', team: BigInt(folder.id.replace('team_', '')) };
      
      getSubfolders(parentType);
    }
  }, [folder.id, selectedSubfolder, getFolderPhotos, getFolderFiles, getSubfolders]);

  const filteredPhotos = (photos || []).filter(photo => {
    if (!searchQuery) return true;
    const photoDate = new Date(Number(photo.timestamp / BigInt(1000000)));
    const dateString = photoDate.toLocaleDateString();
    return dateString.includes(searchQuery);
  });

  const filteredFiles = (files || []).filter(file => {
    if (!searchQuery) return true;
    const { fileName } = getFileInfo(file.filePath);
    return fileName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredSubfolders = (subfolders || []).filter(subfolder => {
    if (!searchQuery) return true;
    return subfolder.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const enhancedFiles: EnhancedFile[] = (files || []).map(file => {
    const { fileName, fileExtension } = getFileInfo(file.filePath);
    return {
      ...file,
      organizationName: folder.name,
      organizationType: folder.type,
      fileName,
      fileExtension,
    };
  });

  const currentData = fileTypeView === 'images' ? filteredPhotos : filteredFiles;
  const isLoading = fileTypeView === 'images' ? photosLoading : filesLoading;

  const handleCreateSubfolder = () => {
    setShowCreateSubfolderModal(true);
  };

  const handleDeleteSubfolder = (subfolder: Subfolder) => {
    setShowDeleteSubfolderConfirm(subfolder);
  };

  const confirmDeleteSubfolder = () => {
    if (!showDeleteSubfolderConfirm) return;
    
    deleteSubfolder(showDeleteSubfolderConfirm.id.toString(), {
      onSuccess: () => {
        setShowDeleteSubfolderConfirm(null);
        // Refresh subfolders list
        const parentType: ParentType = folder.type === 'club' 
          ? { __kind__: 'club', club: BigInt(folder.id.replace('club_', '')) }
          : { __kind__: 'team', team: BigInt(folder.id.replace('team_', '')) };
        getSubfolders(parentType);
      },
      onError: (error) => {
        console.error('Failed to delete subfolder:', error);
        setShowDeleteSubfolderConfirm(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">
            {selectedSubfolder ? selectedSubfolder.name : folder.name}
          </h1>
          <div className="flex items-center justify-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
              folder.type === 'club' 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>
              {folder.type === 'club' ? (
                <Crown className="w-3 h-3" />
              ) : (
                <Trophy className="w-3 h-3" />
              )}
              <span>{folder.type === 'club' ? 'Club' : 'Team'} {selectedSubfolder ? 'Subfolder' : 'Folder'}</span>
            </div>
            <p className="text-sm text-slate-400">
              {selectedSubfolder ? 'Subfolder contents' : `${folder.photoCount} images • ${folder.fileCount} files • ${folder.subfolderCount} subfolders`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageSubfolders && !selectedSubfolder && (
            <button
              onClick={handleCreateSubfolder}
              className="p-2 text-emerald-400 hover:text-emerald-300 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
              title="Create Subfolder"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <button
                onClick={() => onBreadcrumbClick(index)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-sm transition-colors whitespace-nowrap ${
                  index === breadcrumbs.length - 1
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {crumb.type === 'root' && <Home className="w-3 h-3" />}
                {crumb.type === 'folder' && (
                  folder.type === 'club' ? <Crown className="w-3 h-3" /> : <Trophy className="w-3 h-3" />
                )}
                {crumb.type === 'subfolder' && <Folder className="w-3 h-3" />}
                <span>{crumb.name}</span>
              </button>
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-600" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Subfolders Section - Only show when not in a subfolder */}
      {!selectedSubfolder && (
        <div className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center">
              <Folder className="w-4 h-4 text-blue-400 mr-2" />
              Subfolders
            </h3>
            {canManageSubfolders && (
              <button
                onClick={handleCreateSubfolder}
                className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Create</span>
              </button>
            )}
          </div>
          
          {subfoldersLoading ? (
            <div className="flex space-x-3 overflow-x-auto">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-24 h-20 bg-slate-700 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : !subfolders || subfolders.length === 0 ? (
            <div className="text-center py-4">
              <Folder className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No subfolders</p>
              {canManageSubfolders && (
                <p className="text-slate-500 text-xs">Create subfolders to organize your files</p>
              )}
            </div>
          ) : (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {filteredSubfolders.map((subfolder) => (
                <div key={subfolder.id.toString()} className="flex-shrink-0">
                  <button
                    onClick={() => onSubfolderSelect(subfolder)}
                    className="w-24 h-20 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg p-2 transition-all duration-200 group"
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <Folder className="w-6 h-6 text-blue-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-xs text-slate-300 group-hover:text-slate-100 text-center truncate w-full">
                        {subfolder.name}
                      </span>
                    </div>
                  </button>
                  {canManageSubfolders && canDeleteSubfolder(subfolder) && (
                    <div className="flex justify-center mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubfolder(subfolder);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                        title="Delete subfolder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Type Toggle */}
      <div className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex p-1 mx-4 overflow-x-auto">
          <button
            onClick={() => setFileTypeView('images')}
            className={`flex items-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              fileTypeView === 'images'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Images ({selectedSubfolder ? filteredPhotos.length : folder.photoCount})</span>
          </button>
          <button
            onClick={() => setFileTypeView('files')}
            className={`flex items-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              fileTypeView === 'files'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <File className="w-4 h-4" />
            <span>Files ({selectedSubfolder ? filteredFiles.length : folder.fileCount})</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={fileTypeView === 'images' ? "Search images by date..." : "Search files by name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-mobile pl-10"
            />
          </div>

          {/* Admin Controls Notice */}
          {canManageSubfolders && !selectedSubfolder && (
            <div className="card p-4 bg-emerald-500/10 border-emerald-500/20 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Folder className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-medium">Subfolder Management</p>
                    <p className="text-emerald-300 text-sm">
                      As a {folder.type} admin, you can create subfolders to organize files
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCreateSubfolder}
                  className="btn-primary text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Subfolder
                </button>
              </div>
            </div>
          )}

          {/* Content Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-3 animate-pulse">
                  <div className="w-full h-32 bg-slate-700 rounded-lg mb-3"></div>
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : currentData.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                {fileTypeView === 'images' ? (
                  <Camera className="w-8 h-8 text-slate-600" />
                ) : (
                  <File className="w-8 h-8 text-slate-600" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">
                {searchQuery ? `No ${fileTypeView === 'images' ? 'Images' : 'Files'} Found` : `No ${fileTypeView === 'images' ? 'Images' : 'Files'} in ${selectedSubfolder ? 'Subfolder' : 'Folder'}`}
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                {searchQuery
                  ? 'Try adjusting your search criteria.'
                  : `Upload ${fileTypeView === 'images' ? 'images' : 'files'} to ${selectedSubfolder ? selectedSubfolder.name : folder.name} to see them organized here.`
                }
              </p>
            </div>
          ) : fileTypeView === 'images' ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredPhotos.map((photo) => (
                <VaultPhotoCard
                  key={photo.id.toString()}
                  photo={photo}
                  onClick={() => onPhotoSelect(photo)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {enhancedFiles.filter(file => {
                if (!searchQuery) return true;
                return file.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
              }).map((file) => (
                <VaultFileCard
                  key={file.id.toString()}
                  file={file}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onBack}
            className="btn-secondary-mobile"
          >
            Back to Folders
          </button>
          <button
            onClick={onClose}
            className="btn-primary-mobile"
          >
            Close Vault
          </button>
        </div>
      </div>

      {/* Create Subfolder Modal */}
      {showCreateSubfolderModal && (
        <CreateSubfolderModal
          folder={folder}
          onClose={() => setShowCreateSubfolderModal(false)}
          onSuccess={() => {
            setShowCreateSubfolderModal(false);
            // Refresh subfolders list
            const parentType: ParentType = folder.type === 'club' 
              ? { __kind__: 'club', club: BigInt(folder.id.replace('club_', '')) }
              : { __kind__: 'team', team: BigInt(folder.id.replace('team_', '')) };
            getSubfolders(parentType);
          }}
        />
      )}

      {/* Delete Subfolder Confirmation */}
      {showDeleteSubfolderConfirm && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Subfolder</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete "{showDeleteSubfolderConfirm.name}"? This will permanently remove the subfolder and all its contents. This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteSubfolderConfirm(null)}
                  className="btn-secondary"
                  disabled={deletingSubfolder}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSubfolder}
                  disabled={deletingSubfolder}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${deletingSubfolder ? 'btn-loading' : ''}`}
                >
                  {deletingSubfolder ? 'Deleting...' : 'Delete Subfolder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateSubfolderModalProps {
  folder: VaultFolder;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateSubfolderModal({ folder, onClose, onSuccess }: CreateSubfolderModalProps) {
  const [subfolderName, setSubfolderName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { mutate: createSubfolder, isPending, error } = useCreateSubfolder();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!subfolderName.trim()) {
      newErrors.name = 'Subfolder name is required';
    } else if (subfolderName.trim().length > 50) {
      newErrors.name = 'Subfolder name must be 50 characters or less';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(subfolderName.trim())) {
      newErrors.name = 'Subfolder name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const parentType: ParentType = folder.type === 'club' 
      ? { __kind__: 'club', club: BigInt(folder.id.replace('club_', '')) }
      : { __kind__: 'team', team: BigInt(folder.id.replace('team_', '')) };

    createSubfolder({
      name: subfolderName.trim(),
      parentType,
    }, {
      onSuccess: () => {
        onSuccess();
      },
      onError: (error) => {
        console.error('Failed to create subfolder:', error);
      }
    });
  };

  return (
    <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Create Subfolder</h3>
          <p className="text-slate-400 text-sm">
            Create a new subfolder in {folder.name}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">
              {error instanceof Error ? error.message : 'Failed to create subfolder'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Subfolder Name *
            </label>
            <input
              type="text"
              value={subfolderName}
              onChange={(e) => setSubfolderName(e.target.value)}
              className={`input-mobile ${errors.name ? 'input-error' : ''}`}
              placeholder="Enter subfolder name"
              disabled={isPending}
              autoFocus
              maxLength={50}
            />
            {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
            <p className="text-slate-500 text-xs">
              Letters, numbers, spaces, hyphens, and underscores only
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!subfolderName.trim() || isPending}
              className={`btn-primary ${isPending ? 'btn-loading' : ''}`}
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface VaultPhotoCardProps {
  photo: Photo;
  onClick: () => void;
}

function VaultPhotoCard({ photo, onClick }: VaultPhotoCardProps) {
  const { data: imageUrl } = useFileUrl(photo.filePath);

  return (
    <div 
      onClick={onClick}
      className="card p-3 cursor-pointer hover:bg-slate-800/50 transition-all duration-200"
    >
      <div className="relative mb-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Photo"
            className="w-full h-32 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-32 bg-slate-700 rounded-lg flex items-center justify-center">
            <Camera className="w-8 h-8 text-slate-500" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="text-slate-400 text-xs">
          {formatPhotoTime(photo.timestamp)}
        </p>
        
        {/* Interaction stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-slate-400 text-xs">0</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <span className="text-slate-400 text-xs">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VaultFileCardProps {
  file: EnhancedFile;
}

function VaultFileCard({ file }: VaultFileCardProps) {
  const { data: fileUrl } = useFileUrl(file.filePath);

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = file.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card p-4 hover:bg-slate-800/50 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center">
            {getFileTypeIcon(file.fileExtension || '')}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-100 truncate">
              {file.fileName || 'Unknown File'}
            </h4>
            <div className="flex items-center space-x-3 text-slate-400 text-sm">
              <span className="uppercase">{file.fileExtension || 'file'}</span>
              <span>{formatPhotoTime(file.timestamp)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            disabled={!fileUrl}
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800/50 transition-all duration-200 disabled:opacity-50"
            title="Download file"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface PhotoDetailModalProps {
  photo: EnhancedPhoto;
  onClose: () => void;
  onBack: () => void;
}

function PhotoDetailModal({ photo, onClose, onBack }: PhotoDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'photo' | 'comments'>('photo');
  const [newComment, setNewComment] = useState('');

  const { data: imageUrl } = useFileUrl(photo.filePath);

  const tabs = [
    { id: 'photo' as const, label: 'Photo' },
    { id: 'comments' as const, label: `Comments (0)` },
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Photo</h1>
          <p className="text-sm text-slate-400">{photo.organizationName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex p-1 mx-4 overflow-x-auto">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 py-3 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {activeTab === 'photo' ? (
            <div className="space-y-6">
              {/* Photo Display */}
              <div className="card p-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Photo"
                    className="w-full rounded-lg object-cover max-h-96"
                  />
                ) : (
                  <div className="w-full h-64 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Camera className="w-12 h-12 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Photo Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                      photo.organizationType === 'club' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}>
                      {photo.organizationType === 'club' ? (
                        <Crown className="w-3 h-3" />
                      ) : (
                        <Trophy className="w-3 h-3" />
                      )}
                      <span>{photo.organizationType === 'club' ? 'Club' : 'Team'}</span>
                    </div>
                    <span className="text-slate-400 text-sm">{photo.organizationName}</span>
                  </div>
                  <span className="text-slate-500 text-sm">
                    {formatPhotoTime(photo.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comments List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Comments</h3>
                
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No comments yet</p>
                  <p className="text-slate-500 text-sm">Be the first to comment on this photo!</p>
                </div>
              </div>

              {/* Comment Input */}
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none min-h-[80px]"
                  />
                  <button
                    disabled={!newComment.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white p-3 rounded-xl transition-colors flex items-center justify-center min-w-[48px] self-end"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo Actions Bar */}
      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
            >
              <Heart className="w-4 h-4" />
              <span>0</span>
            </button>
            
            <button
              onClick={() => setActiveTab('comments')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>0</span>
            </button>
          </div>
          
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

interface FileUploadModalProps {
  onClose: () => void;
}

function FileUploadModal({ onClose }: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organizationType, setOrganizationType] = useState<'club' | 'team'>('club');
  const [clubId, setClubId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [selectedSubfolderId, setSelectedSubfolderId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: uploadFile, isPending: uploadingFile } = useUploadFile();
  const { mutate: uploadPhoto, isPending: uploadingPhoto } = useUploadPhoto();
  const { mutate: getSubfolders, data: subfolders } = useGetSubfoldersByParent();
  const { getAccessibleClubsForFiles, getAccessibleTeamsForFiles, canCreateSubfolder } = useUserRoles();

  const isPending = uploadingFile || uploadingPhoto;

  React.useEffect(() => {
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.top = '0';
    document.body.style.left = '0';
    
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
    };
  }, []);

  // Load subfolders when organization is selected
  React.useEffect(() => {
    if (organizationType === 'club' && clubId) {
      const parentType: ParentType = { __kind__: 'club', club: BigInt(clubId) };
      getSubfolders(parentType);
    } else if (organizationType === 'team' && teamId) {
      const parentType: ParentType = { __kind__: 'team', team: BigInt(teamId) };
      getSubfolders(parentType);
    }
  }, [organizationType, clubId, teamId, getSubfolders]);

  // Get accessible organizations
  const accessibleClubs = getAccessibleClubsForFiles();
  const accessibleTeams = getAccessibleTeamsForFiles();

  // Filter teams by selected club when uploading team files
  const filteredTeams = organizationType === 'team' && clubId
    ? accessibleTeams.filter(team => team.clubId.toString() === clubId)
    : accessibleTeams;

  // Check if user can create subfolders for selected organization
  const canCreateSubfolders = (organizationType === 'club' && clubId) 
    ? canCreateSubfolder('club', clubId)
    : (organizationType === 'team' && teamId)
    ? canCreateSubfolder('team', teamId)
    : false;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!file) {
      newErrors.file = 'Please select a file';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (organizationType === 'club' && !clubId) {
      newErrors.clubId = 'Please select a club';
    }

    if (organizationType === 'team') {
      if (!clubId) {
        newErrors.clubId = 'Please select a club first';
      }
      if (!teamId) {
        newErrors.teamId = 'Please select a team';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm() || !file) return;

    const isImageFile = file.type.startsWith('image/');
    
    const fileData = {
      file,
      title: title.trim(),
      description: description.trim(),
      clubId: clubId || undefined,
      teamId: organizationType === 'team' ? teamId : undefined,
      subfolderId: selectedSubfolderId || undefined,
    };

    if (isImageFile) {
      uploadPhoto(fileData, {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          console.error('Photo upload failed:', error);
        }
      });
    } else {
      uploadFile(fileData, {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          console.error('File upload failed:', error);
        }
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'organizationType') {
      setOrganizationType(value as 'club' | 'team');
      setClubId(''); // Reset club selection
      setTeamId(''); // Reset team selection
      setSelectedSubfolderId(''); // Reset subfolder selection
    } else if (field === 'clubId') {
      setClubId(value);
      setTeamId(''); // Reset team selection when club changes
      setSelectedSubfolderId(''); // Reset subfolder selection when organization changes
    } else if (field === 'teamId') {
      setTeamId(value);
      setSelectedSubfolderId(''); // Reset subfolder selection when team changes
    } else if (field === 'subfolderId') {
      setSelectedSubfolderId(value);
    } else if (field === 'title') {
      setTitle(value);
    } else if (field === 'description') {
      setDescription(value);
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getSelectedClubName = () => {
    const selected = accessibleClubs.find(club => club.id.toString() === clubId);
    return selected?.name || '';
  };

  const getSelectedTeamName = () => {
    const selected = filteredTeams.find(team => team.id.toString() === teamId);
    return selected?.name || '';
  };

  const getSelectedSubfolderName = () => {
    const selected = subfolders?.find(subfolder => subfolder.id.toString() === selectedSubfolderId);
    return selected?.name || '';
  };

  const isImageFile = file && file.type.startsWith('image/');

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Upload File</h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Select File *
              </label>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center relative ${
                errors.file ? 'border-red-500/50' : 'border-slate-600'
              }`}>
                {file ? (
                  <div>
                    {isImageFile ? (
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-48 bg-slate-700 rounded-lg mb-3 flex items-center justify-center">
                        {getFileTypeIcon(file.name.split('.').pop()?.toLowerCase() || '')}
                      </div>
                    )}
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
                    </p>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium mb-2">Tap to select a file</p>
                    <p className="text-slate-500 text-sm">Images, documents, videos, and more up to 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isPending}
                />
              </div>
              {errors.file && <p className="text-red-400 text-sm mt-2">{errors.file}</p>}
            </div>

            {/* Organization Type */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Users className="w-4 h-4 inline mr-2" />
                Share With *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('organizationType', 'club')}
                  className={`btn-mobile ${
                    organizationType === 'club'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  disabled={isPending || accessibleClubs.length === 0}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Club {accessibleClubs.length === 0 && '(None)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('organizationType', 'team')}
                  className={`btn-mobile ${
                    organizationType === 'team'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  disabled={isPending || accessibleTeams.length === 0}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Team {accessibleTeams.length === 0 && '(None)'}
                </button>
              </div>
            </div>

            {/* Step 1: Club Selection - Always required */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  clubId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  1
                </div>
                <label className="block text-sm font-medium text-slate-300">
                  <Crown className="w-4 h-4 inline mr-2" />
                  Select Club *
                </label>
              </div>
              
              <div className="card p-4 max-h-48 overflow-y-auto">
                {accessibleClubs.length === 0 ? (
                  <div className="text-center py-6">
                    <Crown className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">
                      No clubs available for file sharing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accessibleClubs.map((club) => (
                      <label
                        key={club.id.toString()}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="club"
                          value={club.id.toString()}
                          checked={clubId === club.id.toString()}
                          onChange={(e) => handleInputChange('clubId', e.target.value)}
                          className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                          disabled={isPending}
                        />
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {club.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-200 text-sm font-medium">{club.name}</p>
                          <p className="text-slate-400 text-xs">Club</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {errors.clubId && <p className="text-red-400 text-sm mt-2">{errors.clubId}</p>}
            </div>

            {/* Step 2: Team Selection - Only show for team files and after club is selected */}
            {organizationType === 'team' && clubId && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    teamId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    2
                  </div>
                  <label className="block text-sm font-medium text-slate-300">
                    <Trophy className="w-4 h-4 inline mr-2" />
                    Select Team *
                  </label>
                  <span className="text-slate-400 text-sm">in {getSelectedClubName()}</span>
                </div>
                
                <div className="card p-4 max-h-48 overflow-y-auto">
                  {filteredTeams.length === 0 ? (
                    <div className="text-center py-6">
                      <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        No teams available in {getSelectedClubName()}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTeams.map((team) => (
                        <label
                          key={team.id.toString()}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="team"
                            value={team.id.toString()}
                            checked={teamId === team.id.toString()}
                            onChange={(e) => handleInputChange('teamId', e.target.value)}
                            className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                            disabled={isPending}
                          />
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-200 text-sm font-medium">{team.name}</p>
                            <p className="text-slate-400 text-xs">Team in {getSelectedClubName()}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {errors.teamId && <p className="text-red-400 text-sm mt-2">{errors.teamId}</p>}
              </div>
            )}

            {/* Subfolder Selection */}
            {((organizationType === 'club' && clubId) || (organizationType === 'team' && teamId)) && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  <Folder className="w-4 h-4 inline mr-2" />
                  Subfolder (Optional)
                </label>
                
                {!subfolders || subfolders.length === 0 ? (
                  <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                    <div className="flex items-center space-x-3">
                      <Folder className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-blue-400 font-medium">No Subfolders Available</p>
                        <p className="text-blue-300 text-sm">
                          {canCreateSubfolders 
                            ? 'Create subfolders in the Vault to organize your files better'
                            : 'No subfolders have been created for this organization yet'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card p-4 max-h-32 overflow-y-auto">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer">
                        <input
                          type="radio"
                          name="subfolder"
                          value=""
                          checked={selectedSubfolderId === ''}
                          onChange={(e) => handleInputChange('subfolderId', e.target.value)}
                          className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                          disabled={isPending}
                        />
                        <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
                          <FolderOpen className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-200 text-sm font-medium">Main Folder</p>
                          <p className="text-slate-400 text-xs">Upload to main {organizationType} folder</p>
                        </div>
                      </label>
                      
                      {subfolders.map((subfolder) => (
                        <label
                          key={subfolder.id.toString()}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="subfolder"
                            value={subfolder.id.toString()}
                            checked={selectedSubfolderId === subfolder.id.toString()}
                            onChange={(e) => handleInputChange('subfolderId', e.target.value)}
                            className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                            disabled={isPending}
                          />
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <Folder className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-200 text-sm font-medium">{subfolder.name}</p>
                            <p className="text-slate-400 text-xs">Subfolder</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`input-mobile ${errors.title ? 'input-error' : ''}`}
                placeholder="Enter file title"
                disabled={isPending}
              />
              {errors.title && <p className="text-red-400 text-sm mt-2">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="input-mobile min-h-[100px] resize-none"
                placeholder="Describe the file (optional)"
                disabled={isPending}
              />
            </div>

            {/* Preview with Subfolder Support */}
            {file && ((organizationType === 'club' && clubId) || (organizationType === 'team' && teamId)) && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    {isImageFile ? (
                      <Camera className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <File className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-emerald-400 font-medium">File Upload Preview</p>
                    <p className="text-emerald-300 text-sm mb-2">
                      Sharing "{title || file.name}" with {organizationType === 'team' ? `${getSelectedTeamName()} in ${getSelectedClubName()}` : getSelectedClubName()}
                      {selectedSubfolderId && ` in subfolder "${getSelectedSubfolderName()}"`}
                    </p>
                    <div className="flex items-center space-x-2">
                      {organizationType === 'team' && teamId ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <Crown className="w-3 h-3" />
                            <span>Club: {getSelectedClubName()}</span>
                          </div>
                          <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20">
                            <Trophy className="w-3 h-3" />
                            <span>Team: {getSelectedTeamName()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          <Crown className="w-3 h-3" />
                          <span>Club: {getSelectedClubName()}</span>
                        </div>
                      )}
                      {selectedSubfolderId && (
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          <Folder className="w-3 h-3" />
                          <span>Subfolder: {getSelectedSubfolderName()}</span>
                        </div>
                      )}
                      <span className="text-emerald-300 text-xs">
                        Will be organized as: {isImageFile ? 'Image' : 'File'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subfolder Management Notice */}
            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium">Enhanced File Organization</p>
                  <p className="text-slate-400 text-sm">
                    Files can now be uploaded directly into subfolders for better organization. 
                    {canCreateSubfolders 
                      ? ' As an admin, you can create and manage subfolders in the Vault.'
                      : ' Subfolders are created and managed by team and club administrators.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={
              !file || 
              !title.trim() || 
              !clubId || 
              (organizationType === 'team' && !teamId) || 
              isPending
            }
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? 'Uploading...' : `Upload ${isImageFile ? 'Image' : 'File'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
