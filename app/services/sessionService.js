import sessionRepo from '@repositories/sessionRepository.js';
import auth from '@lib/auth.js';

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

export default {
  createSession,
  listSessionsForTask,
  updateSession,
  deleteSession,
};
