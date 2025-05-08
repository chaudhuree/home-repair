import { z } from 'zod';

// Empty schema since we're toggling the value in the controller
const updateChecklistItemSchema = z.object({}).strict();

export const ChecklistValidation = {
  updateChecklistItemSchema,
};
