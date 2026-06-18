import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid'; // 仅用于生成 User.id
import setupDB from './db';
import User from '../models/user';
import Role from '../models/role';
import Permission from '../models/permission';
import PermissionGroup from '../models/permissionGroup';
import Menu from '../models/menu';
import { ROLES } from '../constants';

// ─── 1. 角色定义 ────────────────────────────────────────────────────────────

const seedRoles = [{ name: ROLES.SuperAdmin }, { name: ROLES.Proxy }];

// ─── 2. 权限组 & 权限定义 ────────────────────────────────────────────────────

const permissionGroupDefs = [
  { key: 'user', name: '用户管理' },
  { key: 'role', name: '角色管理' },
  { key: 'permission', name: '权限管理' },
  { key: 'bot', name: 'Bot 管理' },
  { key: 'botUser', name: 'Bot 用户' },
  { key: 'botMessage', name: 'Bot 消息' },
  { key: 'botUserConfig', name: '客户管理' },
  { key: 'group', name: '群组管理' },
  { key: 'menu', name: '菜单管理' },
];

// 每条权限: [权限组 key, 名称, 路径, action]
const permissionDefs: [string, string, string, string][] = [
  // 用户
  ['user', '查看用户列表', '/users', 'GET'],
  ['user', '查看用户详情', '/users/:id', 'GET'],
  ['user', '创建用户', '/users', 'POST'],
  ['user', '更新用户', '/users/:id', 'PUT'],
  ['user', '删除用户', '/users/:id', 'DELETE'],
  // 角色
  ['role', '查看角色列表', '/roles', 'GET'],
  ['role', '创建角色', '/roles', 'POST'],
  ['role', '更新角色', '/roles/:id', 'PUT'],
  ['role', '删除角色', '/roles/:id', 'DELETE'],
  // 权限
  ['permission', '查看权限列表', '/permissions', 'GET'],
  ['permission', '创建权限', '/permissions', 'POST'],
  ['permission', '更新权限', '/permissions/:id', 'PUT'],
  ['permission', '删除权限', '/permissions/:id', 'DELETE'],
  // Bot
  ['bot', '查看 Bot 列表', '/bots', 'GET'],
  ['bot', '创建 Bot', '/bots', 'POST'],
  ['bot', '更新 Bot', '/bots/:id', 'PUT'],
  ['bot', '删除 Bot', '/bots/:id', 'DELETE'],
  // Bot 用户
  ['botUser', '查看 Bot 用户列表', '/bot-users', 'GET'],
  ['botUser', '更新 Bot 用户', '/bot-users/:id', 'PUT'],
  // Bot 消息
  ['botMessage', '查看 Bot 消息', '/bot-messages', 'GET'],
  // 客户管理 (botUserConfig)
  ['botUserConfig', '查看客户列表', '/bot-user-configs', 'GET'],
  ['botUserConfig', '查看客户详情', '/bot-user-configs/:id', 'GET'],
  ['botUserConfig', '创建客户', '/bot-user-configs', 'POST'],
  ['botUserConfig', '更新客户', '/bot-user-configs/:id', 'PUT'],
  ['botUserConfig', '删除客户', '/bot-user-configs/:id', 'DELETE'],
  // 群组
  ['group', '查看群组列表', '/groups', 'GET'],
  ['group', '创建群组', '/groups', 'POST'],
  ['group', '更新群组', '/groups/:id', 'PUT'],
  ['group', '删除群组', '/groups/:id', 'DELETE'],
  // 菜单
  ['menu', '查看菜单', '/menus', 'GET'],
  ['menu', '创建菜单', '/menus', 'POST'],
  ['menu', '更新菜单', '/menus/:id', 'PUT'],
  ['menu', '删除菜单', '/menus/:id', 'DELETE'],
];

// ─── 3. 管理员账户 ──────────────────────────────────────────────────────────

const adminUsers = [
  {
    email: 'superadmin@admin.com',
    password: 'SuperAdmin@2024',
    roleName: ROLES.SuperAdmin,
    name: 'Super Admin',
    isAdmin: true,
  },
  {
    email: 'proxy@admin.com',
    password: 'Proxy@2024',
    roleName: ROLES.Proxy,
    name: 'Proxy',
    isAdmin: false,
  },
];

// ─── 执行顺序: roles → permissions → users ──────────────────────────────────

async function seedRolesData(): Promise<Map<string, mongoose.Types.ObjectId>> {
  console.log('\n[1/4] 初始化角色...');
  const roleMap = new Map<string, mongoose.Types.ObjectId>();

  for (const roleDef of seedRoles) {
    const existing = await Role.findOne({ name: roleDef.name });
    if (existing) {
      console.log(`  ✓ 角色已存在: ${roleDef.name}`);
      roleMap.set(roleDef.name, existing._id as mongoose.Types.ObjectId);
    } else {
      const role = await Role.create(roleDef);
      console.log(`  + 创建角色: ${roleDef.name}`);
      roleMap.set(roleDef.name, role._id as mongoose.Types.ObjectId);
    }
  }

  return roleMap;
}

async function seedPermissionsData(): Promise<void> {
  console.log('\n[2/4] 初始化权限组 & 权限...');
  const groupMap = new Map<string, mongoose.Types.ObjectId>();

  // 创建权限组
  for (const gDef of permissionGroupDefs) {
    const existing = await PermissionGroup.findOne({ name: gDef.name });
    if (existing) {
      groupMap.set(gDef.key, existing._id as mongoose.Types.ObjectId);
    } else {
      const g = await PermissionGroup.create({ name: gDef.name });
      groupMap.set(gDef.key, g._id as mongoose.Types.ObjectId);
      console.log(`  + 权限组: ${gDef.name}`);
    }
  }

  // 创建权限
  for (const [groupKey, name, path, action] of permissionDefs) {
    const groupId = groupMap.get(groupKey);
    const existing = await Permission.findOne({ path, action });
    if (!existing) {
      await Permission.create({ name, path, action, permissionGroup: groupId });
      console.log(`  + 权限: [${action}] ${path}`);
    }
  }
}

async function assignSuperAdminPermissions(
  roleMap: Map<string, mongoose.Types.ObjectId>,
): Promise<void> {
  console.log('\n[3/4] 给 SuperAdmin 分配全部权限...');

  const superAdminId = roleMap.get(ROLES.SuperAdmin);
  if (!superAdminId) return;

  const allPermissions = await Permission.find({}, '_id');
  const permissionIds = allPermissions.map((p) => p._id);

  await Role.findByIdAndUpdate(superAdminId, {
    $set: { permissions: permissionIds },
  });

  console.log(`  ✓ 已分配 ${permissionIds.length} 条权限给 SuperAdmin`);
}

async function seedAdminUsers(
  roleMap: Map<string, mongoose.Types.ObjectId>,
): Promise<void> {
  console.log('\n[4/4] 初始化管理员账户...');

  for (const u of adminUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  ✓ 用户已存在: ${u.email}`);
      continue;
    }

    const roleId = roleMap.get(u.roleName);
    const hashedPassword = await bcrypt.hash(u.password, 12);

    await User.create({
      id: uuidv4(),
      email: u.email,
      password: hashedPassword,
      name: u.name,
      isAdmin: u.isAdmin ?? false,
      roles: roleId ? [roleId] : [],
    });

    console.log(`  + 创建用户: ${u.email}  密码: ${u.password}`);
  }
}

// ─── 菜单结构定义 ────────────────────────────────────────────────────────────
//
// 图片里的「认证管理」折叠菜单，对应路由 /auth 下的子页面。
// Menu.permission 必填，这里用各子模块的第一条 GET 权限做关联。
//
// 结构：父菜单（认证管理）→ 子菜单（用户管理、角色管理、菜单管理、权限管理、权限组管理）

interface MenuDef {
  name: string;
  path: string;
  icon?: string;
  weight: number;
  // 关联已创建权限的 path+action，用来查 ObjectId
  permissionPath: string;
  permissionAction: string;
  children?: Omit<MenuDef, 'children'>[];
}

const menuDefs: MenuDef[] = [
  {
    name: '认证管理',
    path: '/auth',
    icon: 'SafetyCertificateOutlined',
    weight: 1,
    permissionPath: '/users',
    permissionAction: 'GET',
    children: [
      {
        name: '用户管理',
        path: '/auth/users',
        icon: 'UserOutlined',
        weight: 1,
        permissionPath: '/users',
        permissionAction: 'GET',
      },
      {
        name: '角色管理',
        path: '/auth/roles',
        icon: 'TeamOutlined',
        weight: 2,
        permissionPath: '/roles',
        permissionAction: 'GET',
      },
      {
        name: '菜单管理',
        path: '/auth/menus',
        icon: 'MenuOutlined',
        weight: 3,
        permissionPath: '/menus',
        permissionAction: 'GET',
      },
      {
        name: '权限管理',
        path: '/auth/permissions',
        icon: 'KeyOutlined',
        weight: 4,
        permissionPath: '/permissions',
        permissionAction: 'GET',
      },
      {
        name: '权限组管理',
        path: '/auth/permission-groups',
        icon: 'ApartmentOutlined',
        weight: 5,
        permissionPath: '/permissions',
        permissionAction: 'GET',
      },
    ],
  },
  {
    name: '机器人管理',
    path: '/authorizations',
    icon: 'RobotOutlined',
    weight: 2,
    permissionPath: '/bots',
    permissionAction: 'GET',
  },
  {
    name: '群组管理',
    path: '/groups',
    icon: 'TeamOutlined',
    weight: 3,
    permissionPath: '/groups',
    permissionAction: 'GET',
  },
  {
    name: '客户管理',
    path: '/bot-user-configs',
    icon: 'ContactsOutlined',
    weight: 4,
    permissionPath: '/bot-user-configs',
    permissionAction: 'GET',
  },
];

async function seedMenus(): Promise<void> {
  console.log('\n[5/5] 初始化菜单数据...');

  for (const def of menuDefs) {
    // 查关联权限
    const perm = await Permission.findOne({
      path: def.permissionPath,
      action: def.permissionAction,
    });
    if (!perm) {
      console.warn(
        `  ⚠ 找不到权限 [${def.permissionAction}] ${def.permissionPath}，跳过菜单: ${def.name}`,
      );
      continue;
    }

    // 父菜单 - 幂等
    let parent = await Menu.findOne({ path: def.path });
    if (!parent) {
      parent = await Menu.create({
        name: def.name,
        path: def.path,
        icon: def.icon,
        weight: def.weight,
        permission: perm._id,
        isOnline: true,
      });
      console.log(`  + 父菜单: ${def.name} (${def.path})`);
    } else {
      console.log(`  ✓ 父菜单已存在: ${def.name}`);
    }

    if (!def.children?.length) continue;

    const childIds: mongoose.Types.ObjectId[] = [];

    for (const child of def.children) {
      const childPerm = await Permission.findOne({
        path: child.permissionPath,
        action: child.permissionAction,
      });
      if (!childPerm) {
        console.warn(
          `    ⚠ 找不到权限 [${child.permissionAction}] ${child.permissionPath}，跳过子菜单: ${child.name}`,
        );
        continue;
      }

      let childMenu = await Menu.findOne({ path: child.path });
      if (!childMenu) {
        childMenu = await Menu.create({
          name: child.name,
          path: child.path,
          icon: child.icon,
          weight: child.weight,
          parent: parent._id,
          permission: childPerm._id,
          isOnline: true,
        });
        console.log(`    + 子菜单: ${child.name} (${child.path})`);
      } else {
        console.log(`    ✓ 子菜单已存在: ${child.name}`);
      }

      childIds.push(childMenu._id as mongoose.Types.ObjectId);
    }

    // 更新父菜单的 children 数组（去重合并）
    const existing =
      (parent.children as unknown as mongoose.Types.ObjectId[]) ?? [];
    const merged = Array.from(
      new Set([...existing.map(String), ...childIds.map(String)]),
    ).map((id) => new mongoose.Types.ObjectId(id));
    await Menu.findByIdAndUpdate(parent._id, { $set: { children: merged } });
  }
}

async function main(): Promise<void> {
  try {
    await setupDB();
    console.log('========================================');
    console.log('  bidirection 数据初始化脚本');
    console.log('========================================');

    const roleMap = await seedRolesData();
    await seedPermissionsData();
    await assignSuperAdminPermissions(roleMap);
    await seedAdminUsers(roleMap);
    await seedMenus();

    console.log('\n========================================');
    console.log('  ✅ 初始化完成！');
    console.log('========================================');
    console.log('\n管理员账户：');
    for (const u of adminUsers) {
      console.log(`  邮箱: ${u.email}  密码: ${u.password}`);
    }
  } catch (err) {
    console.error('\n❌ 初始化失败:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB 已断开连接');
  }
}

main();
