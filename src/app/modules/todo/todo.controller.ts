import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { TodoService } from './todo.service';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

// Create a new todo
const createTodo = catchAsync(async (req: Request, res: Response) => {
  const employeeId = req.user?.id;
  const result = await TodoService.createTodo(employeeId, {
    ...req.body,
    employeeId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Todo created successfully',
    data: result,
  });
});

// Get todos by employee ID with optional date filter
const getTodos = catchAsync(async (req: Request, res: Response) => {
  const employeeId = req.user?.id;
  const result = await TodoService.getTodos(employeeId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Todos retrieved successfully',
    data: result,
  });
});

// Get a single todo by ID
const getTodoById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TodoService.getTodoById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Todo retrieved successfully',
    data: result,
  });
});

// Toggle a todo item's isDone status
const updateTodoItem = catchAsync(async (req: Request, res: Response) => {
  const { todoItemId } = req.params;
  const result = await TodoService.updateTodoItem(todoItemId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Todo item status toggled successfully',
    data: result,
  });
});

// Delete a todo
const deleteTodo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TodoService.deleteTodo(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Todo deleted successfully',
    data: result,
  });
});

export const TodoController = {
  createTodo,
  getTodos,
  getTodoById,
  updateTodoItem,
  deleteTodo,
};
