const sprintRepo = require("../repositories/sprintRepository.js");

async function createSprint(payload) {
  return sprintRepo.createSprint(payload);
}

async function listSprints(userId, kind) {
  // For epics, return each epic with its child sprints (and their tasks/sessions)
  const base = await sprintRepo.listSprints(userId || undefined, kind);
  if (kind === "epic") {
    const results = [];
    for (const e of base || []) {
      const full = await sprintRepo.getSprint(e.id, userId || undefined);
      results.push(full || e);
    }
    return results;
  }
  return base;
}

async function getSprint(id, userId) {
  return sprintRepo.getSprint(id, userId);
}

async function deleteSprint(id, userId) {
  return sprintRepo.deleteSprint(id, userId);
}

module.exports = { createSprint, listSprints, getSprint, deleteSprint };
