import { IUpdateChecklistItem } from './reservation.interface';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { 
  createReservationChecklist as createChecklist, 
  getReservationChecklist as getChecklist, 
  updateChecklistItem as updateItem,
  getChecklistItem as getItem 
} from './checklist.util';

/**
 * Creates a checklist for a reservation with default items
 */
const createChecklistService = async (reservationId: string) => {
  try {
    // Use the utility function to create the checklist
    await createChecklist(reservationId);
    
    // Get the created checklist
    return await getChecklist(reservationId);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create checklist');
  }
};

/**
 * Gets a checklist for a reservation
 */
const getChecklistService = async (reservationId: string) => {
  try {
    // Use the utility function to get the checklist
    return await getChecklist(reservationId);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get checklist');
  }
};

/**
 * Gets a single checklist item by ID
 */
const getChecklistItemService = async (itemId: string) => {
  try {
    // Use the utility function to get the checklist item
    return await getItem(itemId);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get checklist item');
  }
};

/**
 * Updates a checklist item's isDone status
 */
const updateChecklistItemService = async (
  itemId: string,
  isDone: boolean
) => {
  try {
    // Use the utility function to update the checklist item
    return await updateItem(itemId, isDone);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update checklist item');
  }
};

export const ChecklistService = {
  createChecklist: createChecklistService,
  getChecklist: getChecklistService,
  getChecklistItem: getChecklistItemService,
  updateChecklistItem: updateChecklistItemService,
};
