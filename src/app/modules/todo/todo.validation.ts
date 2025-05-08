import { z } from 'zod';

const todoItemSchema = z.object({
  content: z.string({
    required_error: 'Content is required',
  }),
  isDone: z.boolean().optional().default(false),
});

const createTodoSchema = z.object({
  body: z.object({
    date: z.string({
      required_error: 'Date is required',
    }),
    todoItems: z.array(todoItemSchema, {
      required_error: 'Todo items are required',
    }).min(1, 'At least one todo item is required'),
  }),
});

const updateTodoItemSchema = z.object({
  body: z.object({
    isDone: z.boolean({
      required_error: 'isDone status is required',
    }),
  }),
});

const todoFilterSchema = z.object({
  query: z.object({
    date: z.string().optional(),
  }).optional().default({}),
});

export const TodoValidation = {
  createTodoSchema,
  updateTodoItemSchema,
  todoFilterSchema,
};
