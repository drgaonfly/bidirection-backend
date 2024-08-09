import { Request, Response } from 'express';
import Role from '../models/role';
import handleAsync from '../utils/handleAsync';
import Permission from '../models/permission';

// 获取所有角色
const getRoles = handleAsync(async (req: Request, res: Response) => {
  const roles = await Role.find().populate('permissions').exec();

  res.json({
    success: true,
    data: roles,
  });
});

// 根据 ID 获取角色
const getRoleById = handleAsync(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id).exec();

  if (!role) {
    res.status(404);
    throw new Error('Role not found');
  }

  res.json({
    success: true,
    data: role,
  });
});

// 添加新角色
const addRole = handleAsync(async (req: Request, res: Response) => {
  const newRole = new Role({
    ...req.body,
  });

  const savedRole = await newRole.save();

  res.json({
    success: true,
    data: savedRole,
  });
});

// 更新角色
const updateRole = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedRole = await Role.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true }
  ).exec();

  if (!updatedRole) {
    res.status(404);
    throw new Error('Role not found');
  }

  res.json({
    success: true,
    data: updatedRole,
  });
});

// 删除角色
const deleteRole = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const role = await Role.findByIdAndDelete(id).exec();

  if (!role) {
    res.status(404);
    throw new Error('Role not found');
  }

  res.json({
    success: true,
    data: { message: 'Role deleted successfully' },
  });
});

// 批量删除角色
const deleteMultipleRoles = handleAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;

  await Role.deleteMany({
    _id: { $in: ids },
  }).exec();

  res.json({
    success: true,
    message: `${ids.length} roles deleted successfully`,
  });
});

export {
  getRoles,
  getRoleById,
  addRole,
  updateRole,
  deleteRole,
  deleteMultipleRoles,
};
