import { Request, Response } from 'express';
import * as supplyService from './supply.service';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

// Create a new supply
export const createSupply = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.createSupply(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Supply created successfully',
    data: result,
  });
});

// Get all supplies
export const getAllSupplies = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.getAllSupplies(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supplies retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get a single supply by ID
export const getSupplyById = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.getSupplyById(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supply retrieved successfully',
    data: result,
  });
});

// Update a supply
export const updateSupply = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.updateSupply(req.params.id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supply updated successfully',
    data: result,
  });
});

// Delete a supply
export const deleteSupply = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.deleteSupply(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supply deleted successfully',
    data: result,
  });
});

// Assign supply to an employee
export const assignSupply = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.assignSupply(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Supply assigned successfully',
    data: result,
  });
});

// Return supply from an employee
export const returnSupply = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.returnSupply(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supply returned successfully',
    data: result,
  });
});

// Get all supply assignments
export const getAllSupplyAssignments = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.getAllSupplyAssignments(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supply assignments retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get supply assignments by user
export const getSupplyAssignmentsByUser = catchAsync(async (req: Request, res: Response) => {
  const result = await supplyService.getSupplyAssignmentsByUser(req.params.userId, req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User supply assignments retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});
