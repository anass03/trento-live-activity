const { UserSettings, Consent, DeviceToken } = require('../data/models');
const { DEFAULT_SETTINGS } = require('./settings.defaults');

function formatSettings(s) {
  return {
    appearance: {
      themeMode: s.themeMode,
      visualEffects: s.visualEffects,
    },
    languageFormat: {
      language: s.language,
      timeFormat: s.timeFormat,
      distanceUnit: s.distanceUnit,
    },
    notifications: {
      emailEnabled: s.emailNotificationsEnabled,
      pushEnabled: s.pushNotificationsEnabled,
      eventNotifications: s.eventNotificationsEnabled,
      activityNotifications: s.activityNotificationsEnabled,
      cityAlertNotifications: s.cityAlertNotificationsEnabled,
    },
    privacyLocation: {
      locationMode: s.locationMode,
      participationVisibility: s.participationVisibility,
      showProfileInParticipants: s.showProfileInParticipants,
    },
    preferences: {
      interests: s.interestsJson || [],
      showOnlyReliableActivities: s.showOnlyReliableActivities,
      showVerifiedActivities: s.showVerifiedActivities,
    },
    accessibility: {
      reduceAnimations: s.reduceAnimations,
      increaseContrast: s.increaseContrast,
      largerText: s.largerText,
    },
    updatedAt: s.updatedAt,
  };
}

async function getOrCreateSettings(userId) {
  let settings = await UserSettings.findOne({ where: { userId } });
  if (!settings) {
    settings = await UserSettings.create({ userId });
  }
  return formatSettings(settings);
}

async function writeConsentLog(userId, type, granted) {
  const latest = await Consent.findOne({
    where: { userId, type },
    order: [['createdAt', 'DESC']],
  });
  if (!latest || latest.granted !== granted) {
    await Consent.create({
      userId,
      type,
      granted,
      version: '1.0',
      grantedAt: new Date(),
      revokedAt: granted ? null : new Date(),
    });
  }
}

async function updateSection(userId, section, payload) {
  let settings = await UserSettings.findOne({ where: { userId } });
  if (!settings) {
    settings = await UserSettings.create({ userId });
  }

  const updates = {};

  if (section === 'appearance') {
    if (payload.themeMode !== undefined) {
      if (!['light', 'dark', 'system'].includes(payload.themeMode)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'themeMode must be light, dark, or system' };
      }
      updates.themeMode = payload.themeMode;
    }
    if (payload.visualEffects !== undefined) {
      if (!['full', 'reduced'].includes(payload.visualEffects)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'visualEffects must be full or reduced' };
      }
      updates.visualEffects = payload.visualEffects;
    }
  } else if (section === 'language-format') {
    if (payload.language !== undefined) {
      if (!['it', 'en', 'de'].includes(payload.language)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'language must be it, en, or de' };
      }
      updates.language = payload.language;
    }
    if (payload.timeFormat !== undefined) {
      if (!['24h', '12h'].includes(payload.timeFormat)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'timeFormat must be 24h or 12h' };
      }
      updates.timeFormat = payload.timeFormat;
    }
    if (payload.distanceUnit !== undefined) {
      if (!['km', 'mi'].includes(payload.distanceUnit)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'distanceUnit must be km or mi' };
      }
      updates.distanceUnit = payload.distanceUnit;
    }
  } else if (section === 'notifications') {
    if (payload.emailEnabled !== undefined) {
      updates.emailNotificationsEnabled = !!payload.emailEnabled;
      await writeConsentLog(userId, 'notif_email', !!payload.emailEnabled);
    }
    if (payload.pushEnabled !== undefined) {
      updates.pushNotificationsEnabled = !!payload.pushEnabled;
      await writeConsentLog(userId, 'notif_push', !!payload.pushEnabled);
      if (!payload.pushEnabled) {
        await DeviceToken.destroy({ where: { userId } }).catch(() => {});
      }
    }
    if (payload.eventNotifications !== undefined) {
      updates.eventNotificationsEnabled = !!payload.eventNotifications;
    }
    if (payload.activityNotifications !== undefined) {
      updates.activityNotificationsEnabled = !!payload.activityNotifications;
    }
    if (payload.cityAlertNotifications !== undefined) {
      updates.cityAlertNotificationsEnabled = !!payload.cityAlertNotifications;
    }
  } else if (section === 'privacy-location') {
    if (payload.locationMode !== undefined) {
      if (!['always', 'while_using', 'never'].includes(payload.locationMode)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'locationMode must be always, while_using, or never' };
      }
      updates.locationMode = payload.locationMode;
    }
    if (payload.participationVisibility !== undefined) {
      if (!['public', 'organizers_only', 'private'].includes(payload.participationVisibility)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'participationVisibility must be public, organizers_only, or private' };
      }
      updates.participationVisibility = payload.participationVisibility;
    }
    if (payload.showProfileInParticipants !== undefined) {
      updates.showProfileInParticipants = !!payload.showProfileInParticipants;
    }
  } else if (section === 'preferences') {
    if (payload.interests !== undefined) {
      if (!Array.isArray(payload.interests)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'interests must be an array' };
      }
      const validInterests = ['music', 'culture', 'outdoor', 'food', 'sport', 'family', 'nightlife', 'relax', 'social', 'art', 'study', 'technology', 'volunteer', 'volontariato', 'arte', 'natura', 'musica', 'cultura', 'gastronomia', 'studio', 'tecnologia'];
      for (const item of payload.interests) {
        if (!validInterests.includes(item.toLowerCase())) {
          throw { status: 400, code: 'VALIDATION_ERROR', message: `Invalid interest: ${item}` };
        }
      }
      updates.interestsJson = payload.interests;
    }
    if (payload.showOnlyReliableActivities !== undefined) {
      updates.showOnlyReliableActivities = !!payload.showOnlyReliableActivities;
    }
    if (payload.showVerifiedActivities !== undefined) {
      updates.showVerifiedActivities = !!payload.showVerifiedActivities;
    }
  } else if (section === 'accessibility') {
    if (payload.reduceAnimations !== undefined) {
      updates.reduceAnimations = !!payload.reduceAnimations;
    }
    if (payload.increaseContrast !== undefined) {
      updates.increaseContrast = !!payload.increaseContrast;
    }
    if (payload.largerText !== undefined) {
      updates.largerText = !!payload.largerText;
    }
  }

  await settings.update(updates);
  return formatSettings(settings);
}

async function updateAllSettings(userId, payload) {
  let settings = await UserSettings.findOne({ where: { userId } });
  if (!settings) {
    settings = await UserSettings.create({ userId });
  }

  // Batch update helper
  const sections = ['appearance', 'language-format', 'notifications', 'privacy-location', 'preferences', 'accessibility'];
  for (const sec of sections) {
    if (payload[sec] && typeof payload[sec] === 'object') {
      // Execute sectional logic
      await updateSection(userId, sec, payload[sec]);
    }
  }

  // Reload settings
  await settings.reload();
  return formatSettings(settings);
}

module.exports = {
  getOrCreateSettings,
  updateSection,
  updateAllSettings,
};
