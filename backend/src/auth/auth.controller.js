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

module.exports = { register, login, getMe, updateProfile, deleteAccount, setup2fa, verify2fa };
