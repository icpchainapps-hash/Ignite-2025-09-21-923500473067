export const STORAGE_KEYS = {
  NOTIFICATION_READ_STATUS: 'ignite_notification_read_status',
  DUTY_SWAPS: 'ignite_duty_swaps',
  EVENT_RSVPS: 'ignite_event_rsvps',
  COMMENT_REACTIONS: 'ignite_comment_reactions',
  ANNOUNCEMENT_REACTIONS: 'ignite_announcement_reactions',
  ANNOUNCEMENT_COMMENT_REACTIONS: 'ignite_announcement_comment_reactions',
} as const;

export const QUERY_KEYS = {
  ACTOR: 'actor',
  USER_STATUS: 'userStatus',
  USER_PROFILE: 'currentUserProfile',
  IS_ADMIN: 'isCurrentUserAdmin',
  USER_ROLES: 'currentUserRoles',
  USER_CLUBS: 'userClubs',
  ALL_TEAMS: 'allTeams',
  EVENTS: 'events',
  UPCOMING_EVENTS: 'upcomingEvents',
  NOTIFICATIONS: 'notifications',
  CHAT_THREADS: 'chatThreads',
  RECENT_MESSAGES: 'recentMessages',
  USER_PHOTOS: 'userPhotos',
  VAULT_FOLDERS: 'vaultFolders',
  CHILDREN: 'callerChildren',
  ANNOUNCEMENTS: 'userAnnouncements',
  RECENT_ANNOUNCEMENTS: 'recentAnnouncements',
  ADMIN_STATISTICS: 'adminStatistics',
  STRIPE_CONFIGURED: 'isStripeConfigured',
  MATCH_DAY_POSTS: 'matchDayPosts',
  BROADCAST_THREADS: 'broadcastMessageThreads',
} as const;

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free – Core',
    price: 0,
    features: [
      'Unlimited teams & events',
      'Basic team chat (1 thread, no media)',
      'Basic text announcements',
      'Player availability & RSVPs',
      'Season calendar view',
      'Blockchain data security',
    ],
    limitations: [
      'No duty assignment/swaps',
      'No file & photo storage',
      'No team social feed',
      'No attendance & duty reporting',
      'Limited chat functionality',
    ],
  },
  PRO_CLUB: {
    name: 'Pro (Multi-Team Club)',
    price: 150.00,
    period: 'per club/month',
    priceInCents: 15000,
    popular: true,
  },
} as const;

export const PRO_FEATURES = [
  'All Free – Core features',
  'Unlimited announcements',
  'Duty assignments and swap requests',
  'Full chat (threads, attachments, reactions)',
  'File & photo storage',
  'Team social feed (posts, comments, likes)',
  'Attendance & duty reporting',
  'Blockchain data security',
] as const;

export const EMOJI_REACTIONS = [
  '❤️', '😀', '😂', '👍', '👏', '🔥', '⚽', '🏆', '💪', '🎉', '👌', '😍'
] as const;

export const COMMENT_REACTIONS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '⚽'
] as const;

export const DUTY_ROLES = [
  'BBQ',
  'Canteen',
  'Oranges',
  'First Aid',
  'Equipment Setup',
  'Referee',
  'Timekeeper',
  'Photography',
  'Team Manager',
  'Water Bottles',
  'Cleanup',
  'Parking',
] as const;

export const SPORTS_LIST = [
  'Soccer', 'Basketball', 'Baseball', 'Tennis', 'Volleyball', 
  'Swimming', 'Track & Field', 'Golf', 'Hockey', 'Rugby', 'Cricket',
  'Badminton', 'Table Tennis', 'Cycling', 'Running', 'Martial Arts', 'Other'
] as const;

export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export const REFRESH_INTERVALS = {
  NOTIFICATIONS: 300000,
  EVENTS: 300000,
  MESSAGES: 30000,
  STATISTICS: 30000,
} as const;

export const ROLE_CONFIGS = {
  'Team Admin': {
    icon: 'Shield',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  'Coach': {
    icon: 'Settings',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  'Player': {
    icon: 'User',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  'Parent': {
    icon: 'Baby',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  'Child': {
    icon: 'Baby',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  'Club Admin': {
    icon: 'Crown',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
} as const;

export const EVENT_TYPE_CONFIGS = {
  game: {
    label: 'Game',
    description: 'Competitive match or tournament',
    icon: 'Gamepad2',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  training: {
    label: 'Training',
    description: 'Practice session or skill development',
    icon: 'Dumbbell',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  socialEvent: {
    label: 'Social Event',
    description: 'Team building or social gathering',
    icon: 'Coffee',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
} as const;

export const ORGANIZATION_TYPE_CONFIGS = {
  club: {
    label: 'Club',
    icon: 'Crown',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  team: {
    label: 'Team',
    icon: 'Trophy',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
} as const;
