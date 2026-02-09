const taskRepo = require("../repositories/taskRepository.js");

async function createTask(sprintId, task, userId) {
  return taskRepo.createTask(sprintId, task, userId);
}

async function getTask(id, userId) {
  return taskRepo.getTask(id, userId);
}

async function updateTask(id, data, userId) {
  return taskRepo.updateTask(id, data, userId);
}

async function deleteTask(id, userId) {
  return taskRepo.deleteTask(id, userId);
}

module.exports = { createTask, getTask, updateTask, deleteTask };
