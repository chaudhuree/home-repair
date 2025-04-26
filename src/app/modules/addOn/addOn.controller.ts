import { Request, Response } from 'express';
import * as addOnService from './addOn.service';
import sendResponse from '../../utils/sendResponse';

export async function createAddOn(req: Request, res: Response) {
  const result = await addOnService.createAddOn(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'AddOn created successfully',
    data: result,
  });
}

export async function getAllAddOns(req: Request, res: Response) {
  const { serviceId, ...paginationOptions } = req.query;
  const result = await addOnService.getAllAddOns(paginationOptions, serviceId as string);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'AddOns retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
}

export async function updateAddOn(req: Request, res: Response) {
  const result = await addOnService.updateAddOn(req.params.id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'AddOn updated successfully',
    data: result,
  });
}

export async function deleteAddOn(req: Request, res: Response) {
  const result = await addOnService.deleteAddOn(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'AddOn deleted successfully',
    data: result,
  });
}

export async function getAddOnsByServiceId(req: Request, res: Response) {
  const serviceId = req.params.serviceId;
  const result = await addOnService.getAddOnsByServiceId(serviceId, req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'AddOns for service retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
}

