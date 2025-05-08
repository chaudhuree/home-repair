import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import prisma from '../../utils/prisma';

// Default checklist items to be created for each reservation
const DEFAULT_CHECKLIST_ITEMS = [
  'All walls are painted with required coats',
  'All trim molding are properly painted',
  'All furniture has been returned to original position',
  'All materials and equipment have been removed',
];

/**
 * Creates a checklist for a reservation with default items
 */
export const createReservationChecklist = async (reservationId: string): Promise<void> => {
  try {
    // Check if reservation exists
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      console.error(`Reservation not found: ${reservationId}`);
      return;
    }

    // Check if checklist already exists
    const existingChecklist = await prisma.reservationChecklist.findUnique({
      where: { reservationId },
    });

    if (existingChecklist) {
      console.log(`Checklist already exists for reservation ${reservationId}`);
      return;
    }

    // First create the checklist
    const checklist = await prisma.reservationChecklist.create({
      data: {
        reservationId,
      },
    });

    // Then create the checklist items
    const itemPromises = DEFAULT_CHECKLIST_ITEMS.map(description => {
      return prisma.checklistItem.create({
        data: {
          reservationChecklistId: checklist.id,
          description,
          isDone: false,
        },
      });
    });

    await Promise.all(itemPromises);
    console.log(`Created checklist for reservation ${reservationId}`);
  } catch (error) {
    console.error('Error creating reservation checklist:', error);
    // Don't throw error here to prevent reservation creation from failing
  }
};

/**
 * Gets the checklist for a reservation
 */
export const getReservationChecklist = async (reservationId: string) => {
  try {
    // Check if reservation exists
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new AppError(httpStatus.NOT_FOUND, 'Reservation not found');
    }

    // Get the checklist with its items
    const checklist = await prisma.reservationChecklist.findUnique({
      where: { reservationId },
      include: {
        items: true,
      },
    });

    if (!checklist) {
      throw new AppError(httpStatus.NOT_FOUND, 'Checklist not found for this reservation');
    }

    return checklist;
  } catch (error) {
    console.error('Error getting reservation checklist:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get checklist');
  }
};

/**
 * Updates a checklist item's isDone status
 */
export const updateChecklistItem = async (itemId: string, isDone: boolean) => {
  try {
    // Check if the item exists
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new AppError(httpStatus.NOT_FOUND, 'Checklist item not found');
    }

    // Update the item
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isDone },
    });

    return updatedItem;
  } catch (error) {
    console.error('Error updating checklist item:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update checklist item');
  }
};
