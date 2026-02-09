const sprintRepo = require("../repositories/sprintRepository.js");

async function createSprint(payload) {
  return sprintRepo.createSprint(payload);
}

async function listSprints(userId, kind) {
  if (userId) {
    return sprintRepo.listSprints(userId, kind);
  }
  return sprintRepo.listSprints(undefined, kind);
}

async function getSprint(id, userId) {
  return sprintRepo.getSprint(id, userId);
}

async function deleteSprint(id, userId) {
  return sprintRepo.deleteSprint(id, userId);
}

module.exports = { createSprint, listSprints, getSprint, deleteSprint };
