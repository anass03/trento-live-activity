const service = require('./auth.service');

async function register(req, res, next) {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const result = await service.login(req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function getMe(req, res, next) {
  try {
    const user = await service.getMe(req.user.id);
    res.json(user);
  } catch (e) { next(e); }
}

async function updateProfile(req, res, next) {
  try {
    const user = await service.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (e) { next(e); }
}

async function deleteAccount(req, res, next) {
  try {
    await service.deleteAccount(req.user.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

async function setup2fa(req, res, next) {
  try {
    const result = await service.setup2fa(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
}

async function verify2fa(req, res, next) {
  try {
    const result = await service.verify2fa(req.user.id, req.body.token);
    res.json(result);
  } catch (e) { next(e); }
}

async function forgotPassword(req, res, next) {
  try {
    await service.forgotPassword(req.body.email);
    res.json({ message: 'If that email is registered, a reset link has been sent' });
  } catch (e) { next(e); }
}

async function resetPassword(req, res, next) {
  try {
    await service.resetPassword(req.params.token, req.body.password);
    res.json({ message: 'Password updated successfully' });
  } catch (e) { next(e); }
}

async function logout(req, res, next) {
  try {
    service.logout(req.user.jti);
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { register, login, logout, getMe, updateProfile, deleteAccount, setup2fa, verify2fa, forgotPassword, resetPassword };
