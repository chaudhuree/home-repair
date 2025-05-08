import { z } from 'zod';

const updateChecklistItemSchema = z.object({
  isDone: z.boolean({
    required_error: 'isDone is required',
    invalid_type_error: 'isDone must be a boolean',
  }),
});

export const ChecklistValidation = {
  updateChecklistItemSchema,
};
