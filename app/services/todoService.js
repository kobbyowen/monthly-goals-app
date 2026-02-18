import * as todoRepo from "@repositories/todoRepository.js";

async function createTodo(data, userId) {
  return todoRepo.createTodo(data, userId);
}

async function getTodo(id, userId) {
  return todoRepo.getTodo(id, userId);
}

async function listTodos(filters, userId) {
  return todoRepo.listTodos(filters, userId);
}

async function updateTodo(id, data, userId) {
  return todoRepo.updateTodo(id, data, userId);
}

async function deleteTodo(id, userId) {
  return todoRepo.deleteTodo(id, userId);
}

export { createTodo, getTodo, listTodos, updateTodo, deleteTodo };
