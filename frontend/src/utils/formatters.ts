export const formatTime = (timestamp: bigint | number): string => {
  try {
    let date: Date;
    
    if (typeof timestamp === 'bigint') {
      const timestampMs = Number(timestamp / BigInt(1000000));
      
      if (timestampMs <= 0 || timestampMs > Date.now() + 86400000) {
        return 'Unknown time';
      }
      
      date = new Date(timestampMs);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
    
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
  } catch (error) {
    return 'Unknown time';
  }
};

export const formatEventTime = (timestamp: bigint) => {
  const date = new Date(Number(timestamp));
  return {
    fullDate: date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    }),
    date: date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

export const formatPhotoTime = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp / BigInt(1000000)));
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatCurrency = (amount: number | null): string => {
  if (amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatNumber = (num: number | null): string => {
  if (num === null) return 'N/A';
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const calculateAge = (dateOfBirth: bigint): number => {
  const birthDate = new Date(Number(dateOfBirth));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const getFullAddress = (address: string, suburb: string, state: string, postcode: string): string => {
  const addressParts = [address, suburb, state, postcode].filter(Boolean);
  return addressParts.join(', ');
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  try {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  } catch (error) {
    return false;
  }
};
