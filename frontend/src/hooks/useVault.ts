import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useFileUpload } from '../blob-storage/FileStorage';
import { Photo, PhotoReaction, PhotoComment, File as BackendFile, Subfolder, ParentType } from '../backend';

// Photo Gallery Hooks - Enhanced for organized folder storage
export function useGetUserPhotos() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Photo[]>({
    queryKey: ['userPhotos'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      
      const currentUserPrincipal = identity.getPrincipal().toString();
      const userPhotos: Photo[] = [];
      
      // Get all photos and filter by user's access permissions
      const allPhotos = await actor.getAllPhotos();
      
      // Get user's accessible clubs and teams
      const [allClubs, allTeams] = await Promise.all([
        actor.getAllClubs(),
        actor.getAllTeams(),
      ]);
      
      // Filter clubs where user is creator/admin
      const userClubIds = allClubs
        .filter(club => club.creator.toString() === currentUserPrincipal)
        .map(club => club.id);
      
      // Filter teams where user is creator/admin
      const userTeamIds = allTeams
        .filter(team => team.creator.toString() === currentUserPrincipal)
        .map(team => team.id);
      
      // Filter photos based on user's access to clubs and teams
      for (const photo of allPhotos) {
        let hasAccess = false;
        
        if (photo.clubId && userClubIds.some(id => id === photo.clubId)) {
          hasAccess = true;
        }
        
        if (photo.teamId && userTeamIds.some(id => id === photo.teamId)) {
          hasAccess = true;
        }
        
        if (hasAccess) {
          userPhotos.push(photo);
        }
      }
      
      // Sort by timestamp (newest first)
      userPhotos.sort((a, b) => Number(b.timestamp - a.timestamp));
      
      return userPhotos;
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
  });
}

export function useUploadPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { uploadFile } = useFileUpload();

  return useMutation({
    mutationFn: async (photoData: {
      file: File; // Browser File type
      title: string;
      description?: string;
      clubId?: string;
      teamId?: string;
      subfolderId?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Create organized folder structure based on club/team selection and subfolder
      const timestamp = Date.now();
      const fileExtension = photoData.file.name.split('.').pop() || 'jpg';
      const fileName = `photo-${timestamp}.${fileExtension}`;
      
      let folderPath: string;
      if (photoData.teamId && photoData.clubId) {
        // Team photo with club association
        if (photoData.subfolderId) {
          folderPath = `vault/club_${photoData.clubId}/team_${photoData.teamId}/subfolders/${photoData.subfolderId}/images/${fileName}`;
        } else {
          folderPath = `vault/club_${photoData.clubId}/team_${photoData.teamId}/images/${fileName}`;
        }
      } else if (photoData.clubId) {
        // Club-only photo
        if (photoData.subfolderId) {
          folderPath = `vault/club_${photoData.clubId}/subfolders/${photoData.subfolderId}/images/${fileName}`;
        } else {
          folderPath = `vault/club_${photoData.clubId}/images/${fileName}`;
        }
      } else if (photoData.teamId) {
        // Legacy team photo without club association
        if (photoData.subfolderId) {
          folderPath = `vault/team_${photoData.teamId}/subfolders/${photoData.subfolderId}/images/${fileName}`;
        } else {
          folderPath = `vault/team_${photoData.teamId}/images/${fileName}`;
        }
      } else {
        folderPath = `gallery/${fileName}`;
      }
      
      console.log('Uploading photo to organized folder path with subfolder support:', folderPath);
      
      const uploadResult = await uploadFile(folderPath, photoData.file);
      
      // Register photo in backend with club/team association
      const clubIdBigInt = photoData.clubId ? BigInt(photoData.clubId) : null;
      const teamIdBigInt = photoData.teamId ? BigInt(photoData.teamId) : null;
      
      const photo = await actor.uploadPhoto(uploadResult.path, clubIdBigInt, teamIdBigInt);
      
      console.log('Photo uploaded and registered with enhanced club-team association and subfolder support:', {
        photoId: photo.id.toString(),
        filePath: photo.filePath,
        clubId: photo.clubId?.toString(),
        teamId: photo.teamId?.toString(),
        folderPath,
        subfolderId: photoData.subfolderId,
        hasClubTeamAssociation: !!(photoData.teamId && photoData.clubId)
      });
      
      return {
        photo,
        uploadResult,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['clubPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['teamPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
      queryClient.invalidateQueries({ queryKey: ['folderPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['folderFiles'] });
      queryClient.invalidateQueries({ queryKey: ['subfolders'] });
    },
  });
}

export function useGetPhotoReactions() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (photoId: string): Promise<PhotoReaction[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPhotoReactions(BigInt(photoId));
    },
  });
}

export function useReactToPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, reaction }: {
      photoId: string;
      reaction: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.reactToPhoto(BigInt(photoId), reaction);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photoReactions', variables.photoId] });
      // Refresh notifications to show reaction notifications to photo uploader
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Enhanced photo comments hook with proper user name resolution and chronological sorting
export function useGetPhotoComments() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (photoId: string): Promise<Array<PhotoComment & { senderName: string; formattedTime: string }>> => {
      if (!actor) throw new Error('Actor not available');
      
      const comments = await actor.getPhotoComments(BigInt(photoId));
      const enhancedComments: Array<PhotoComment & { senderName: string; formattedTime: string }> = [];
      
      // Enhance each comment with user profile information
      for (const comment of comments) {
        // Ensure we always have a valid display name - use displayName from backend if available, otherwise use principal ID
        // The backend should provide displayName, but we add a safety check to ensure it's never empty
        let senderName = comment.displayName;
        
        // Safety check: if displayName is empty, null, or undefined, use the principal ID
        if (!senderName || senderName.trim() === '' || senderName === 'unknown') {
          senderName = comment.user.toString();
          console.warn('Comment had invalid displayName, using principal ID:', {
            commentId: comment.id.toString(),
            originalDisplayName: comment.displayName,
            fallbackName: senderName
          });
        }
        
        const formattedTime = formatMessageTime(comment.timestamp);
        
        enhancedComments.push({
          ...comment,
          senderName,
          formattedTime,
        });
        
        console.log('Enhanced comment with display name or principal ID:', {
          commentId: comment.id.toString(),
          userPrincipal: comment.user.toString(),
          originalDisplayName: comment.displayName,
          finalSenderName: senderName,
          comment: comment.comment
        });
      }
      
      // Sort comments by timestamp (oldest first for chronological order)
      enhancedComments.sort((a, b) => Number(a.timestamp - b.timestamp));
      
      console.log('Photo comments enhanced with display names or principal IDs:', enhancedComments.map(c => ({
        id: c.id.toString(),
        senderName: c.senderName,
        originalDisplayName: c.displayName,
        comment: c.comment
      })));
      
      return enhancedComments;
    },
  });
}

export function useCommentOnPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, comment }: {
      photoId: string;
      comment: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Properly handle emoji encoding for storage and retrieval
      // Ensure the comment is properly encoded as UTF-8 to preserve emojis
      const utf8EncodedComment = comment;
      
      console.log('Sending comment with emojis:', {
        originalComment: comment,
        encodedComment: utf8EncodedComment,
        containsEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(comment)
      });
      
      const result = await actor.commentOnPhoto(BigInt(photoId), utf8EncodedComment);
      
      console.log('Comment created with display name or principal ID:', {
        commentId: result.id.toString(),
        displayName: result.displayName,
        comment: result.comment
      });
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photoComments', variables.photoId] });
      // Refresh notifications to show comment notifications to all club/team members
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Comment Reactions Hooks - New functionality for reacting to comments
interface CommentReaction {
  id: string;
  commentId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

const COMMENT_REACTIONS_STORAGE_KEY = 'ignite_comment_reactions';

function getStoredCommentReactions(): CommentReaction[] {
  try {
    const stored = localStorage.getItem(COMMENT_REACTIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function setStoredCommentReactions(reactions: CommentReaction[]): void {
  try {
    localStorage.setItem(COMMENT_REACTIONS_STORAGE_KEY, JSON.stringify(reactions));
  } catch (error) {
    console.error('Failed to store comment reactions:', error);
  }
}

export function useGetCommentReactions() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (commentId: string): Promise<CommentReaction[]> => {
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.getCommentReactions(BigInt(commentId));
      
      // Mock implementation using localStorage
      const reactions = getStoredCommentReactions();
      return reactions.filter(reaction => reaction.commentId === commentId);
    },
  });
}

export function useReactToComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({ commentId, reaction }: {
      commentId: string;
      reaction: string;
    }) => {
      if (!identity) throw new Error('Identity not available');
      
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.reactToComment(BigInt(commentId), reaction);
      
      // Mock implementation using localStorage
      const reactions = getStoredCommentReactions();
      const userPrincipal = identity.getPrincipal().toString();
      
      // Check if user already reacted to this comment with this reaction
      const existingReactionIndex = reactions.findIndex(r => 
        r.commentId === commentId && 
        r.user === userPrincipal && 
        r.reaction === reaction
      );
      
      if (existingReactionIndex >= 0) {
        // Remove existing reaction (toggle off)
        reactions.splice(existingReactionIndex, 1);
      } else {
        // Add new reaction
        const newReaction: CommentReaction = {
          id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          commentId,
          user: userPrincipal,
          reaction,
          timestamp: Date.now(),
        };
        reactions.push(newReaction);
      }
      
      setStoredCommentReactions(reactions);
      
      return { success: true, commentId, reaction, userPrincipal };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commentReactions', variables.commentId] });
      // TODO: When backend is ready, refresh notifications to show comment reaction notifications
      // queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// File Management Hooks - New functionality for general file uploads
export function useGetUserFiles() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<BackendFile[]>({
    queryKey: ['userFiles'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      
      const currentUserPrincipal = identity.getPrincipal().toString();
      const userFiles: BackendFile[] = [];
      
      // Get all files and filter by user's access permissions
      const allFiles = await actor.getAllFiles();
      
      // Get user's accessible clubs and teams
      const [allClubs, allTeams] = await Promise.all([
        actor.getAllClubs(),
        actor.getAllTeams()
      ]);
      
      // Filter clubs where user is creator/admin
      const userClubIds = allClubs
        .filter(club => club.creator.toString() === currentUserPrincipal)
        .map(club => club.id);
      
      // Filter teams where user is creator/admin
      const userTeamIds = allTeams
        .filter(team => team.creator.toString() === currentUserPrincipal)
        .map(team => team.id);
      
      // Filter files based on user's access to clubs and teams
      for (const file of allFiles) {
        let hasAccess = false;
        
        if (file.clubId && userClubIds.some(id => id === file.clubId)) {
          hasAccess = true;
        }
        
        if (file.teamId && userTeamIds.some(id => id === file.teamId)) {
          hasAccess = true;
        }
        
        if (hasAccess) {
          userFiles.push(file);
        }
      }
      
      // Sort by timestamp (newest first)
      userFiles.sort((a, b) => Number(b.timestamp - a.timestamp));
      
      return userFiles;
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
  });
}

export function useUploadFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { uploadFile } = useFileUpload();

  return useMutation({
    mutationFn: async (fileData: {
      file: File; // Browser File type
      title: string;
      description?: string;
      clubId?: string;
      teamId?: string;
      subfolderId?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Create organized folder structure based on club/team selection and subfolder
      const timestamp = Date.now();
      const fileExtension = fileData.file.name.split('.').pop() || 'bin';
      const fileName = `file-${timestamp}.${fileExtension}`;
      
      let folderPath: string;
      if (fileData.teamId && fileData.clubId) {
        // Team file with club association
        if (fileData.subfolderId) {
          folderPath = `vault/club_${fileData.clubId}/team_${fileData.teamId}/subfolders/${fileData.subfolderId}/files/${fileName}`;
        } else {
          folderPath = `vault/club_${fileData.clubId}/team_${fileData.teamId}/files/${fileName}`;
        }
      } else if (fileData.clubId) {
        // Club-only file
        if (fileData.subfolderId) {
          folderPath = `vault/club_${fileData.clubId}/subfolders/${fileData.subfolderId}/files/${fileName}`;
        } else {
          folderPath = `vault/club_${fileData.clubId}/files/${fileName}`;
        }
      } else if (fileData.teamId) {
        // Legacy team file without club association
        if (fileData.subfolderId) {
          folderPath = `vault/team_${fileData.teamId}/subfolders/${fileData.subfolderId}/files/${fileName}`;
        } else {
          folderPath = `vault/team_${fileData.teamId}/files/${fileName}`;
        }
      } else {
        folderPath = `files/${fileName}`;
      }
      
      console.log('Uploading file to organized folder path with subfolder support:', folderPath);
      
      const uploadResult = await uploadFile(folderPath, fileData.file);
      
      // Register file in backend with club/team association
      const clubIdBigInt = fileData.clubId ? BigInt(fileData.clubId) : null;
      const teamIdBigInt = fileData.teamId ? BigInt(fileData.teamId) : null;
      
      const file = await actor.uploadFile(uploadResult.path, clubIdBigInt, teamIdBigInt);
      
      console.log('File uploaded and registered with enhanced club-team association and subfolder support:', {
        fileId: file.id.toString(),
        filePath: file.filePath,
        clubId: file.clubId?.toString(),
        teamId: file.teamId?.toString(),
        folderPath,
        subfolderId: fileData.subfolderId,
        hasClubTeamAssociation: !!(fileData.teamId && fileData.clubId)
      });
      
      return {
        file,
        uploadResult,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userFiles'] });
      queryClient.invalidateQueries({ queryKey: ['clubFiles'] });
      queryClient.invalidateQueries({ queryKey: ['teamFiles'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
      queryClient.invalidateQueries({ queryKey: ['folderFiles'] });
      queryClient.invalidateQueries({ queryKey: ['folderPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['subfolders'] });
    },
  });
}

// Vault Hooks - Enhanced for organized folder access with proper membership checking and subfolder support
export function useGetVaultFolders() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Array<{ id: string; name: string; type: 'club' | 'team'; photoCount: number; fileCount: number; subfolderCount: number }>>({
    queryKey: ['vaultFolders'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      
      const currentUserPrincipal = identity.getPrincipal().toString();
      const folders: Array<{ id: string; name: string; type: 'club' | 'team'; photoCount: number; fileCount: number; subfolderCount: number }> = [];
      
      console.log('Loading vault folders with subfolder support for user:', currentUserPrincipal);
      
      // Get all clubs and teams to check user access
      const [allClubs, allTeams, clubMemberships, teamMemberships, allSubfolders] = await Promise.all([
        actor.getAllClubs(),
        actor.getAllTeams(),
        actor.getAllClubs().then(clubs => 
          Promise.all(clubs.map(club => 
            actor.getClubMembershipsByClub(club.id).catch(() => [])
          ))
        ),
        actor.getAllTeams().then(teams => 
          Promise.all(teams.map(team => 
            actor.getTeamMembershipsByTeam(team.id).catch(() => [])
          ))
        ),
        actor.getAllSubfolders()
      ]);
      
      // Check accessible clubs (where user is creator or has membership)
      for (let i = 0; i < allClubs.length; i++) {
        const club = allClubs[i];
        const memberships = clubMemberships[i] || [];
        
        const hasAccess = club.creator.toString() === currentUserPrincipal ||
          memberships.some(membership => membership.user.toString() === currentUserPrincipal);
        
        if (hasAccess) {
          try {
            const [clubPhotos, clubFiles] = await Promise.all([
              actor.getPhotosByClubId(club.id),
              actor.getFilesByClubId(club.id)
            ]);
            
            // Count subfolders for this club
            const clubSubfolders = allSubfolders.filter(subfolder => {
              switch (subfolder.parentType.__kind__) {
                case 'club':
                  return subfolder.parentType.club === club.id;
                default:
                  return false;
              }
            });
            
            const folderId = `club_${club.id.toString()}`;
            
            console.log(`Club ${club.name} (${folderId}): ${clubPhotos.length} photos, ${clubFiles.length} files, ${clubSubfolders.length} subfolders`);
            
            folders.push({
              id: folderId,
              name: club.name,
              type: 'club',
              photoCount: clubPhotos.length,
              fileCount: clubFiles.length,
              subfolderCount: clubSubfolders.length,
            });
          } catch (error) {
            console.warn('Failed to get files for club:', club.id.toString(), error);
            folders.push({
              id: `club_${club.id.toString()}`,
              name: club.name,
              type: 'club',
              photoCount: 0,
              fileCount: 0,
              subfolderCount: 0,
            });
          }
        }
      }
      
      // Check accessible teams (where user is creator or has membership)
      for (let i = 0; i < allTeams.length; i++) {
        const team = allTeams[i];
        const memberships = teamMemberships[i] || [];
        
        const hasAccess = team.creator.toString() === currentUserPrincipal ||
          memberships.some(membership => membership.user.toString() === currentUserPrincipal);
        
        if (hasAccess) {
          try {
            const [teamPhotos, teamFiles] = await Promise.all([
              actor.getPhotosByTeamId(team.id),
              actor.getFilesByTeamId(team.id)
            ]);
            
            // Count subfolders for this team
            const teamSubfolders = allSubfolders.filter(subfolder => {
              switch (subfolder.parentType.__kind__) {
                case 'team':
                  return subfolder.parentType.team === team.id;
                default:
                  return false;
              }
            });
            
            const folderId = `team_${team.id.toString()}`;
            
            console.log(`Team ${team.name} (${folderId}): ${teamPhotos.length} photos, ${teamFiles.length} files, ${teamSubfolders.length} subfolders`);
            
            folders.push({
              id: folderId,
              name: team.name,
              type: 'team',
              photoCount: teamPhotos.length,
              fileCount: teamFiles.length,
              subfolderCount: teamSubfolders.length,
            });
          } catch (error) {
            console.warn('Failed to get files for team:', team.id.toString(), error);
            folders.push({
              id: `team_${team.id.toString()}`,
              name: team.name,
              type: 'team',
              photoCount: 0,
              fileCount: 0,
              subfolderCount: 0,
            });
          }
        }
      }
      
      console.log('Total vault folders loaded with subfolder support:', folders.length);
      return folders.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
  });
}

export function useGetFolderPhotos() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (folderId: string): Promise<Photo[]> => {
      if (!actor) throw new Error('Actor not available');
      
      console.log('Loading photos for folder:', folderId);
      
      // Handle subfolder photo loading
      if (folderId.startsWith('subfolder_')) {
        const subfolderId = folderId.replace('subfolder_', '');
        // For now, return empty array as backend doesn't have subfolder-specific photo retrieval
        // This would be implemented when backend adds getPhotosBySubfolder function
        console.log('Subfolder photo loading not yet implemented in backend for subfolder:', subfolderId);
        return [];
      }
      
      // Use the backend's getPhotosByFolder method for organized folder access
      const photos = await actor.getPhotosByFolder(folderId);
      
      console.log(`Folder ${folderId} contains ${photos.length} photos`);
      
      return photos.sort((a, b) => Number(b.timestamp - a.timestamp));
    },
  });
}

export function useGetFolderFiles() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (folderId: string): Promise<BackendFile[]> => {
      if (!actor) throw new Error('Actor not available');
      
      console.log('Loading files for folder:', folderId);
      
      // Handle subfolder file loading
      if (folderId.startsWith('subfolder_')) {
        const subfolderId = folderId.replace('subfolder_', '');
        // For now, return empty array as backend doesn't have subfolder-specific file retrieval
        // This would be implemented when backend adds getFilesBySubfolder function
        console.log('Subfolder file loading not yet implemented in backend for subfolder:', subfolderId);
        return [];
      }
      
      // Use the backend's getFilesByFolder method for organized folder access
      const files = await actor.getFilesByFolder(folderId);
      
      console.log(`Folder ${folderId} contains ${files.length} files`);
      
      return files.sort((a, b) => Number(b.timestamp - a.timestamp));
    },
  });
}

// Subfolder Management Hooks
export function useGetSubfoldersByParent() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (parentType: ParentType): Promise<Subfolder[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSubfoldersByParent(parentType);
    },
  });
}

export function useCreateSubfolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, parentType }: {
      name: string;
      parentType: ParentType;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate subfolder name
      if (!name.trim()) {
        throw new Error('Subfolder name is required');
      }
      
      if (name.trim().length > 50) {
        throw new Error('Subfolder name must be 50 characters or less');
      }
      
      // Check for invalid characters
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
        throw new Error('Subfolder name can only contain letters, numbers, spaces, hyphens, and underscores');
      }
      
      return actor.createSubfolder(name.trim(), parentType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subfolders'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
    },
  });
}

export function useDeleteSubfolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subfolderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteSubfolder(BigInt(subfolderId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subfolders'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
      queryClient.invalidateQueries({ queryKey: ['folderPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['folderFiles'] });
    },
  });
}

export function useGetAllSubfolders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Subfolder[]>({
    queryKey: ['allSubfolders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllSubfolders() || [];
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
  });
}

const formatMessageTime = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp / BigInt(1000000)));
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }
};
