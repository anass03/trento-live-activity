const service = require('./settings.service');

async function getSettings(req, res, next) {
  try {
    const result = await service.getOrCreateSettings(req.user.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function patchAllSettings(req, res, next) {
  try {
    const result = await service.updateAllSettings(req.user.id, req.body);
    res.json({ success: true, settings: result });
  } catch (e) {
    next(e);
  }
}

async function patchAppearance(req, res, next) {
  try {
    const result = await service.updateSection(req.user.id, 'appearance', req.body);
    res.json(result.appearance);
  } catch (e) {
    next(e);
  }
}

async function patchLanguageFormat(req, res, next) {
  try {
    const result = await service.updateSection(req.user.id, 'language-format', req.body);
    res.json(result.languageFormat);
  } catch (e) {
    next(e);
  }
}

async function patchNotifications(req, res, next) {
  try {
    const result = await service.updateSection(req.user.id, 'notifications', req.body);
    res.json(result.notifications);
  } catch (e) {
    next(e);
  }
}

async function patchPrivacyLocation(req, res, next) {
  try {
    const result = await service.updateSection(req.user.id, 'privacy-location', req.body);
    res.json(result.privacyLocation);
  } catch (e) {
    next(e);
  }
}

async function patchPreferences(req, res, next) {
  try {
    const result = await service.updateSection(req.user.id, 'preferences', req.body);
    res.json(result.preferences);
  } catch (e) {
    next(e);
  }
}

async function patchAccessibility(req, res, next) {
  try {
    const result = await service.updateSection(req.user.id, 'accessibility', req.body);
    res.json(result.accessibility);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getSettings,
  patchAllSettings,
  patchAppearance,
  patchLanguageFormat,
  patchNotifications,
  patchPrivacyLocation,
  patchPreferences,
  patchAccessibility,
};
