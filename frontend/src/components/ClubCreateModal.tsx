import React, { useState, useEffect } from 'react';
import { X, Users, FileText, MapPin, ArrowLeft, Trophy, CheckCircle, AlertCircle, Loader2, Camera, Upload, Trash2 } from 'lucide-react';
import { useCreateClub } from '../hooks/useQueries';
import { useFileUpload } from '../blob-storage/FileStorage';

interface ClubCreateModalProps {
  onClose: () => void;
}

export default function ClubCreateModal({ onClose }: ClubCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    sport: '',
    isPublic: true,
    website: '',
    contactEmail: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { mutate: createClub, isPending, error } = useCreateClub();
  const { uploadFile } = useFileUpload();

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Club name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    let logoPath: string | undefined;

    if (logoFile) {
      setIsUploadingLogo(true);
      try {
        const timestamp = Date.now();
        const fileExtension = logoFile.name.split('.').pop() || 'png';
        const fileName = `club-logo-${timestamp}.${fileExtension}`;
        const path = `club-logos/${fileName}`;
        
        const uploadResult = await uploadFile(path, logoFile);
        logoPath = uploadResult.path;
      } catch (error) {
        console.error('Failed to upload logo:', error);
        setIsUploadingLogo(false);
        setErrors({ logo: 'Failed to upload logo. Please try again.' });
        return;
      }
      setIsUploadingLogo(false);
    }

    const clubData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      logoPath,
    };

    createClub(clubData, {
      onSuccess: (newClub) => {
        setSuccessMessage(`✅ Club "${newClub.name}" created successfully! You have been automatically assigned as Club Admin.`);
        
        setTimeout(() => {
          onClose();
        }, 2000);
      },
      onError: (error) => {
        console.error('Club creation failed:', error);
      }
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const sports = [
    'Soccer', 'Basketball', 'Baseball', 'Tennis', 'Volleyball', 
    'Swimming', 'Track & Field', 'Golf', 'Hockey', 'Rugby', 'Cricket',
    'Badminton', 'Table Tennis', 'Cycling', 'Running', 'Martial Arts', 'Other'
  ];

  const getDisplayError = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Technical error during club creation. Please try again.';
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col" style={{
      position: 'fixed',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '0',
      border: 'none',
      borderRadius: '0',
      zIndex: 9999
    }}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10" style={{
        position: 'sticky',
        top: '0',
        margin: '0',
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: '1rem',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)'
      }}>
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending || isUploadingLogo}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Create Club</h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending || isUploadingLogo}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {successMessage && (
        <div className="mx-4 mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-emerald-400 font-medium text-sm">{successMessage}</p>
            <p className="text-emerald-300 text-xs mt-1">
              Closing automatically... Your new club will appear in the clubs list immediately.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">
              {getDisplayError(error)}
            </p>
            <p className="text-red-300 text-xs mt-1">
              Please check your information and try again.
            </p>
          </div>
        </div>
      )}

      {(isPending || isUploadingLogo) && (
        <div className="mx-4 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-blue-400 font-medium text-sm">
              {isUploadingLogo ? 'Uploading logo...' : 'Creating your club...'}
            </p>
            <p className="text-blue-300 text-xs mt-1">
              {isUploadingLogo 
                ? 'Uploading club logo to storage.'
                : 'Setting up club structure and automatically assigning you as Club Admin.'
              }
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Users className="w-4 h-4 inline mr-2" />
                Club Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input-mobile ${errors.name ? 'input-error' : ''}`}
                placeholder="Enter club name"
                disabled={isPending || isUploadingLogo}
                autoFocus
              />
              {errors.name && <p className="text-red-400 text-sm mt-2">{errors.name}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <FileText className="w-4 h-4 inline mr-2" />
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`input-mobile min-h-[120px] resize-none ${errors.description ? 'input-error' : ''}`}
                placeholder="Describe your club"
                disabled={isPending || isUploadingLogo}
              />
              {errors.description && <p className="text-red-400 text-sm mt-2">{errors.description}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Trophy className="w-4 h-4 inline mr-2" />
                Primary Sport
              </label>
              <select
                value={formData.sport}
                onChange={(e) => handleInputChange('sport', e.target.value)}
                className="input-mobile"
                disabled={isPending || isUploadingLogo}
              >
                <option value="">Select sport...</option>
                {sports.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="input-mobile"
                placeholder="Club location (optional)"
                disabled={isPending || isUploadingLogo}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className={`input-mobile ${errors.contactEmail ? 'input-error' : ''}`}
                placeholder="contact@yourclub.com (optional)"
                disabled={isPending || isUploadingLogo}
              />
              {errors.contactEmail && <p className="text-red-400 text-sm mt-2">{errors.contactEmail}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="input-mobile"
                placeholder="https://yourclub.com (optional)"
                disabled={isPending || isUploadingLogo}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Camera className="w-4 h-4 inline mr-2" />
                Club Logo
              </label>
              
              <div className={`border-2 border-dashed rounded-xl p-6 text-center relative ${
                errors.logo ? 'border-red-500/50' : 'border-slate-600'
              }`}>
                {logoPreview ? (
                  <div className="space-y-4">
                    <img 
                      src={logoPreview} 
                      alt="Club logo preview" 
                      className="w-24 h-24 object-cover rounded-lg mx-auto shadow-lg"
                    />
                    <div className="space-y-2">
                      <p className="text-white text-sm font-medium">{logoFile?.name}</p>
                      <div className="flex items-center justify-center space-x-3">
                        <label className="btn-secondary text-sm cursor-pointer">
                          <Camera className="w-4 h-4 mr-2" />
                          Change Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoSelect}
                            className="hidden"
                            disabled={isPending || isUploadingLogo}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="btn-secondary text-sm text-red-400 hover:text-red-300"
                          disabled={isPending || isUploadingLogo}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium mb-2">Add Club Logo</p>
                    <p className="text-slate-500 text-sm">JPG, PNG, or GIF up to 10MB (optional)</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isPending || isUploadingLogo}
                />
              </div>
              {errors.logo && <p className="text-red-400 text-sm mt-2">{errors.logo}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Privacy Settings
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('isPublic', true)}
                  className={`btn-mobile ${
                    formData.isPublic
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  disabled={isPending || isUploadingLogo}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('isPublic', false)}
                  className={`btn-mobile ${
                    !formData.isPublic
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  disabled={isPending || isUploadingLogo}
                >
                  Private
                </button>
              </div>
              <p className="text-slate-400 text-sm mt-3">
                {formData.isPublic 
                  ? 'Anyone can find and join your club' 
                  : 'Only invited members can join your club'
                }
              </p>
            </div>

            {formData.name && formData.description && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Club logo" 
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    ) : (
                      <Users className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">{formData.name}</p>
                    <p className="text-slate-400 text-sm">
                      {formData.sport && `${formData.sport} • `}
                      {formData.location && `${formData.location} • `}
                      {formData.isPublic ? 'Public' : 'Private'} Club
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Automatic Club Admin Role Assignment</h4>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10" style={{
        position: 'sticky',
        bottom: '0',
        margin: '0',
        paddingTop: '1rem',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)'
      }}>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending || isUploadingLogo}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || isUploadingLogo || !formData.name.trim() || !formData.description.trim()}
            className={`btn-primary-mobile ${(isPending || isUploadingLogo) ? 'btn-loading' : ''}`}
          >
            {isUploadingLogo ? 'Uploading Logo...' : isPending ? 'Creating Club...' : 'Create Club'}
          </button>
        </div>
      </div>
    </div>
  );
}
