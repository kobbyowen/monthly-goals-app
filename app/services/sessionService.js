const sessionRepo = require("../repositories/sessionRepository.js");
const auth = require("../lib/auth.js");

async function createSession(taskId, s, userToken) {
  const user = userToken ? await auth.getUserFromToken(userToken) : null;
  const userId = user ? user.id : null;
  return sessionRepo.createSession(taskId, s, userId);
}

async function listSessionsForTask(taskId, userToken) {
  const user = userToken ? await auth.getUserFromToken(userToken) : null;
  const userId = user ? user.id : null;
  return sessionRepo.getSessionsForTask(taskId, userId);
}

async function updateSession(id, data, userToken) {
  const user = userToken ? await auth.getUserFromToken(userToken) : null;
  const userId = user ? user.id : null;
  return sessionRepo.updateSession(id, data, userId);
}

async function deleteSession(id, userToken) {
  const user = userToken ? await auth.getUserFromToken(userToken) : null;
  const userId = user ? user.id : null;
  return sessionRepo.deleteSession(id, userId);
}

module.exports = {
  createSession,
  listSessionsForTask,
  updateSession,
  deleteSession,
};
