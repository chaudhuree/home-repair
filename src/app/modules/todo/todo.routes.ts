import express from 'express';
import { TodoController } from './todo.controller';
import validateRequest from '../../middlewares/validateRequest';
import { TodoValidation } from './todo.validation';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

// Create a new todo (only for employees)
router.post(
  '/',
  auth(UserRole.employee),
  validateRequest(TodoValidation.createTodoSchema),
  TodoController.createTodo
);

// Get todos with optional date filter (only for employees)
router.get(
  '/',
  auth(UserRole.employee),
  TodoController.getTodos
);

// Get a single todo by ID (only for employees)
router.get(
  '/:id',
  auth(UserRole.employee),
  TodoController.getTodoById
);

// Toggle a todo item's isDone status (only for employees)
router.patch(
  '/item/:todoItemId',
  auth(UserRole.employee),
  TodoController.updateTodoItem
);

// Delete a todo (only for employees)
router.delete(
  '/:id',
  auth(UserRole.employee),
  TodoController.deleteTodo
);

export const TodoRoutes = router;
