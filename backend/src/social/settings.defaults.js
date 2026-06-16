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
    // Default "never": un account nuovo parte senza posizione attiva; l'utente
    // sceglie "in uso"/"sempre" e solo allora il browser chiede il permesso.
    locationMode: 'never',
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
