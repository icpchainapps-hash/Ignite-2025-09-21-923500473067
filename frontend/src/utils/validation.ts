export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validateUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return 'Please enter a valid URL';
  }
};

export const validateDateRange = (startDate: string, endDate: string): string | null => {
  if (!startDate || !endDate) return null;
  if (new Date(startDate) >= new Date(endDate)) {
    return 'End date must be after start date';
  }
  return null;
};

export const validateTimeRange = (startTime: string, endTime: string, date: string): string | null => {
  if (!startTime || !endTime || !date) return null;
  
  const startDateTime = new Date(`${date}T${startTime}`);
  const endDateTime = new Date(`${date}T${endTime}`);
  
  if (endDateTime <= startDateTime) {
    return 'End time must be after start time';
  }
  return null;
};

export const validateSubfolderName = (name: string): string | null => {
  if (!name.trim()) {
    return 'Subfolder name is required';
  }
  if (name.trim().length > 50) {
    return 'Subfolder name must be 50 characters or less';
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
    return 'Subfolder name can only contain letters, numbers, spaces, hyphens, and underscores';
  }
  return null;
};

export const validateRecurrence = (
  isRecurring: boolean,
  interval: number,
  endType: string,
  endDate: string,
  occurrences: number,
  customDays: number[],
  frequency: string
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!isRecurring) return errors;

  if (interval < 1) {
    errors.recurrenceInterval = 'Interval must be at least 1';
  }

  if (endType === 'date' && !endDate) {
    errors.recurrenceEndDate = 'End date is required';
  }

  if (endType === 'occurrences' && occurrences < 1) {
    errors.recurrenceOccurrences = 'Number of occurrences must be at least 1';
  }

  if (frequency === 'custom' && customDays.length === 0) {
    errors.customDays = 'Please select at least one day for custom recurrence';
  }

  return errors;
};
