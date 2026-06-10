const DEFAULT_SETTINGS = {
  appearance: {
    themeMode: 'system',
    visualEffects: 'full',
  },
  languageFormat: {
    language: 'it',
    timeFormat: '24h',
    distanceUnit: 'km',
  },
  notifications: {
    emailEnabled: true,
    pushEnabled: false,
    eventNotifications: true,
    activityNotifications: true,
    cityAlertNotifications: true,
  },
  privacyLocation: {
    locationMode: 'while_using',
    participationVisibility: 'public',
    showProfileInParticipants: true,
  },
  preferences: {
    interests: [],
    showOnlyReliableActivities: false,
    showVerifiedActivities: false,
  },
  accessibility: {
    reduceAnimations: false,
    increaseContrast: false,
    largerText: false,
  },
};

module.exports = { DEFAULT_SETTINGS };
