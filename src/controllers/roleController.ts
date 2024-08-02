import { Request, Response } from 'express';
import Role from '../models/role';
import handleAsync from '../utils/handleAsync';

// 获取所有角色
const getRoles = handleAsync(async (req: Request, res: Response) => {
  const roles = await Role.find().exec();
  
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
  const { name } = req.body;

  const roleExists = await Role.findOne({ name }).exec();

  if (roleExists) {
    res.status(400);
    throw new Error('Role already exists');
  }

  const newRole = new Role({
    name,
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
  const { name, permissions, dataPermissions } = req.body;

  const updatedRole = await Role.findByIdAndUpdate(
    id,
    { name, permissions, dataPermissions },
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

export { getRoles, getRoleById, addRole, updateRole, deleteRole, deleteMultipleRoles };
