import { Request, Response } from 'express';
import * as spaceTypeService from './spaceType.service';
import sendResponse from '../../utils/sendResponse';

export async function createSpaceType(req: Request, res: Response) {
  const result = await spaceTypeService.createSpaceType(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Space type created successfully',
    data: result,
  });
}

export async function getAllSpaceTypes(req: Request, res: Response) {
  const result = await spaceTypeService.getAllSpaceTypes(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Space types retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
}

export async function updateSpaceType(req: Request, res: Response) {
  const result = await spaceTypeService.updateSpaceType(req.params.id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Space type updated successfully',
    data: result,
  });
}

export async function deleteSpaceType(req: Request, res: Response) {
  const result = await spaceTypeService.deleteSpaceType(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Space type deleted successfully',
    data: result,
  });
}
