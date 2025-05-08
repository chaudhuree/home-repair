import { Prisma, UserRole, PrismaClient } from '@prisma/client';
import prisma from '../../utils/prisma';
import { ITodo, ITodoFilter, ITodoItemUpdate } from './todo.interface';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

// Create a new todo
const createTodo = async (employeeId: string, payload: ITodo) => {
  // Check if the user is an employee
  const employee = await prisma.user.findUnique({
    where: {
      id: employeeId,
    },
  });

  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  if (employee.role !== UserRole.employee) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only employees can create todos');
  }

  // Parse the date string to a Date object
  const todoDate = new Date(payload.date);

  // Create the todo with its items in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the todo
    const todo = await tx.todo.create({
      data: {
        employeeId,
        date: todoDate,
      },
    });

    // Create todo items
    const todoItemsData = payload.todoItems.map((item) => ({
      todoId: todo.id,
      content: item.content,
      isDone: item.isDone || false,
    }));

    await tx.todoItem.createMany({
      data: todoItemsData,
    });

    // Return the created todo with its items
    return await tx.todo.findUnique({
      where: {
        id: todo.id,
      },
      include: {
        todoItems: true,
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  });

  return result;
};

// Get todos by employee ID with optional date filter
const getTodos = async (employeeId: string, filters: ITodoFilter) => {
  const { date } = filters;

  // Build the where condition
  const whereCondition: any = {
    employeeId,
  };

  // Add date filter if provided
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    whereCondition.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  const todos = await prisma.todo.findMany({
    where: whereCondition,
    include: {
      todoItems: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  return todos;
};

// Get a single todo by ID
const getTodoById = async (id: string) => {
  const todo = await prisma.todo.findUnique({
    where: {
      id,
    },
    include: {
      todoItems: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!todo) {
    throw new AppError(httpStatus.NOT_FOUND, 'Todo not found');
  }

  return todo;
};

// Toggle a todo item's isDone status
const updateTodoItem = async (todoItemId: string) => {
  // Check if the todo item exists
  const todoItem = await prisma.todoItem.findUnique({
    where: {
      id: todoItemId,
    },
    include: {
      todo: true,
    },
  });

  if (!todoItem) {
    throw new AppError(httpStatus.NOT_FOUND, 'Todo item not found');
  }

  // Toggle the isDone status (if true make it false, if false make it true)
  const updatedTodoItem = await prisma.todoItem.update({
    where: {
      id: todoItemId,
    },
    data: {
      isDone: !todoItem.isDone, // Toggle the current value
    },
  });

  return updatedTodoItem;
};

// Delete a todo
const deleteTodo = async (id: string) => {
  // Check if the todo exists
  const todo = await prisma.todo.findUnique({
    where: {
      id,
    },
  });

  if (!todo) {
    throw new AppError(httpStatus.NOT_FOUND, 'Todo not found');
  }

  // Delete the todo and its items in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete all todo items
    await tx.todoItem.deleteMany({
      where: {
        todoId: id,
      },
    });

    // Delete the todo
    await tx.todo.delete({
      where: {
        id,
      },
    });
  });

  return { message: 'Todo deleted successfully' };
};

export const TodoService = {
  createTodo,
  getTodos,
  getTodoById,
  updateTodoItem,
  deleteTodo,
};
