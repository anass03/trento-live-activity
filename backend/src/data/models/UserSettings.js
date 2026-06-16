const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('UserSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    // Appearance
    themeMode: {
      type: DataTypes.ENUM('light', 'dark', 'system'),
      defaultValue: 'system',
    },
    visualEffects: {
      type: DataTypes.ENUM('full', 'reduced'),
      defaultValue: 'full',
    },
    // Language & Format
    language: {
      type: DataTypes.ENUM('it', 'en', 'de'),
      defaultValue: 'it',
    },
    timeFormat: {
      type: DataTypes.ENUM('24h', '12h'),
      defaultValue: '24h',
    },
    distanceUnit: {
      type: DataTypes.ENUM('km', 'mi'),
      defaultValue: 'km',
    },
    // Notifications
    emailNotificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    pushNotificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    eventNotificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    activityNotificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    cityAlertNotificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Privacy & Location
    locationMode: {
      type: DataTypes.ENUM('always', 'while_using', 'never'),
      defaultValue: 'never',
    },
    participationVisibility: {
      type: DataTypes.ENUM('public', 'organizers_only', 'private'),
      defaultValue: 'public',
    },
    showProfileInParticipants: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Preferences
    interestsJson: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    showOnlyReliableActivities: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    showVerifiedActivities: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Accessibility
    reduceAnimations: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    increaseContrast: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    largerText: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'user_settings',
    timestamps: true,
  });
};
