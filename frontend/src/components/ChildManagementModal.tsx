import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Users, Plus, Edit3, Trash2, ArrowLeft, CheckCircle, AlertCircle, Baby } from 'lucide-react';
import { useGetCallerChildren, useCreateChild, useUpdateChild, useDeleteChild } from '../hooks/useChildren';
import { useGetUserClubs } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import type { Child, Team } from '../backend';

interface ChildManagementModalProps {
  onClose: () => void;
}

export default function ChildManagementModal({ onClose }: ChildManagementModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { data: children, isLoading: childrenLoading } = useGetCallerChildren();
  const { data: clubs } = useGetUserClubs();
  const { data: allTeams } = useGetAllTeams();
  const { identity } = useInternetIdentity();

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

  const getAccessibleTeams = (): Team[] => {
    if (!clubs || !allTeams || !identity) return [];
    
    const currentUserPrincipal = identity.getPrincipal().toString();
    const userClubIds = clubs
      .filter(club => club.creator.toString() === currentUserPrincipal)
      .map(club => club.id);
    
    return allTeams.filter(team => 
      userClubIds.some(clubId => clubId === team.clubId)
    );
  };

  const accessibleTeams = getAccessibleTeams();

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
    setShowCreateForm(false);
    setEditingChild(null);
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTeamName = (teamId?: bigint) => {
    if (!teamId) return 'No team assigned';
    const team = accessibleTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown team';
  };

  const calculateAge = (dateOfBirth: bigint) => {
    const birthDate = new Date(Number(dateOfBirth));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (showCreateForm || editingChild) {
    return (
      <ChildFormModal
        child={editingChild}
        accessibleTeams={accessibleTeams}
        onClose={() => {
          setShowCreateForm(false);
          setEditingChild(null);
        }}
        onSuccess={handleSuccess}
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
        <h1 className="text-lg font-semibold text-slate-100">Manage Children</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="p-2 -mr-2 text-emerald-400 hover:text-emerald-300 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {childrenLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !children || children.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Baby className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">No Children Added</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Add your children to manage their team assignments and track their sports activities.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary-mobile"
              >
                Add First Child
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">Your Children</h2>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Child
                </button>
              </div>

              <div className="space-y-3">
                {children.map((child) => (
                  <div key={child.id.toString()} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-lg font-bold">
                            {child.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-100">{child.name}</h4>
                          <p className="text-slate-400 text-sm">
                            Age {calculateAge(child.dateOfBirth)} • Born {formatDate(child.dateOfBirth)}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            Team: {getTeamName(child.teamId)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingChild(child)}
                          className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(child.id.toString())}
                          className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 card p-6 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100 mb-2">About Child Management</h4>
                <div className="text-slate-300 text-sm space-y-2">
                  <p>As a parent, you can:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                    <li>Add and manage your children's profiles</li>
                    <li>Assign children to teams you have access to</li>
                    <li>Track their sports activities and participation</li>
                    <li>Update their information as they grow</li>
                  </ul>
                  <p className="mt-3">
                    Children can only be assigned to teams in clubs where you are the creator or have appropriate permissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteChildModal
          childId={showDeleteConfirm}
          childName={children?.find(c => c.id.toString() === showDeleteConfirm)?.name || 'Unknown'}
          onClose={() => setShowDeleteConfirm(null)}
          onSuccess={() => {
            setShowDeleteConfirm(null);
            handleSuccess('Child deleted successfully');
          }}
        />
      )}

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <button
          onClick={onClose}
          className="w-full btn-primary-mobile"
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface ChildFormModalProps {
  child: Child | null;
  accessibleTeams: Team[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function ChildFormModal({ child, accessibleTeams, onClose, onSuccess }: ChildFormModalProps) {
  const [formData, setFormData] = useState({
    name: child?.name || '',
    dateOfBirth: child ? new Date(Number(child.dateOfBirth)).toISOString().split('T')[0] : '',
    teamId: child?.teamId?.toString() || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createChild, isPending: isCreating, error: createError } = useCreateChild();
  const { mutate: updateChild, isPending: isUpdating, error: updateError } = useUpdateChild();

  const isEditing = !!child;
  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Child name is required';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const childData = {
      name: formData.name.trim(),
      dateOfBirth: new Date(formData.dateOfBirth).getTime(),
      teamId: formData.teamId || undefined,
    };

    if (isEditing) {
      updateChild({
        childId: child.id.toString(),
        ...childData,
      }, {
        onSuccess: () => {
          onSuccess('Child updated successfully');
        }
      });
    } else {
      createChild(childData, {
        onSuccess: () => {
          onSuccess('Child added successfully');
        }
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">
          {isEditing ? 'Edit Child' : 'Add Child'}
        </h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm font-medium">
            {error instanceof Error ? error.message : 'Failed to save child'}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <User className="w-4 h-4 inline mr-2" />
                Child Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input-mobile ${errors.name ? 'input-error' : ''}`}
                placeholder="Enter child's name"
                disabled={isPending}
                autoFocus
              />
              {errors.name && <p className="text-red-400 text-sm mt-2">{errors.name}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                className={`input-mobile ${errors.dateOfBirth ? 'input-error' : ''}`}
                disabled={isPending}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.dateOfBirth && <p className="text-red-400 text-sm mt-2">{errors.dateOfBirth}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Users className="w-4 h-4 inline mr-2" />
                Team Assignment
              </label>
              <select
                value={formData.teamId}
                onChange={(e) => handleInputChange('teamId', e.target.value)}
                className="input-mobile"
                disabled={isPending}
              >
                <option value="">No team assigned</option>
                {accessibleTeams.map((team) => (
                  <option key={team.id.toString()} value={team.id.toString()}>
                    {team.name}
                  </option>
                ))}
              </select>
              <p className="text-slate-400 text-sm">
                {accessibleTeams.length === 0 
                  ? 'No teams available. Create a club and team first to assign children.'
                  : 'Select a team from clubs you manage (optional)'
                }
              </p>
            </div>

            {formData.name && formData.dateOfBirth && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Baby className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">{formData.name}</p>
                    <p className="text-slate-400 text-sm">
                      Born {new Date(formData.dateOfBirth).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {formData.teamId && (
                        <span> • Team: {accessibleTeams.find(t => t.id.toString() === formData.teamId)?.name}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || !formData.name.trim() || !formData.dateOfBirth}
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Child' : 'Add Child')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteChildModalProps {
  childId: string;
  childName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteChildModal({ childId, childName, onClose, onSuccess }: DeleteChildModalProps) {
  const { mutate: deleteChild, isPending, error } = useDeleteChild();

  const handleDelete = () => {
    deleteChild(childId, {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  return (
    <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Child</h3>
          <p className="text-slate-400 mb-6">
            Are you sure you want to delete "{childName}"? This will permanently remove their profile and team assignments. This action cannot be undone.
          </p>
          
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">
                  {error instanceof Error ? error.message : 'Failed to delete child'}
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isPending ? 'btn-loading' : ''}`}
            >
              {isPending ? 'Deleting...' : 'Delete Child'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
