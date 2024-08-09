import { Request, Response } from 'express';
import Menu, { IMenu } from '../models/menu';
import handleAsync from '../utils/handleAsync';

// Function to get children menus by parentId
const getChildren = async (parentId: string | null): Promise<IMenu[]> => {
  console.log('getChildren called with parentId:', parentId);
  const children = await Menu.find({ parent: parentId })
    .populate('permission')
    .populate('parent') // Populate parent field
    .exec();
  return children.map((child) => child.toObject());
};

// Build query based on query parameters
const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.name) {
    query.name = { $regex: queryParams.name, $options: 'i' };
  }

  if (queryParams.parent) {
    query.parent = queryParams.parent;
  } else {
    query.parent = null;
  }

  // No need to handle children queries

  return query;
};

// Get menus with pagination and their children
const getMenus = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  // Execute the query
  const menus = await Menu.find(query)
    .populate('permission')
    .populate('parent') // Populate parent field
    .sort('-createdAt') // Sort by creation time in descending order
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Menu.countDocuments(query).exec();

  // Get menus with their children
  const menusWithChildren = await Promise.all(
    menus.map(async (menu) => {
      const menuWithChildren = menu.toObject();
      const children = await getChildren(menu._id);
      return {
        ...menuWithChildren,
        children,
      };
    }),
  );

  res.json({
    success: true,
    data: menusWithChildren,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// Add a new menu
const addMenu = handleAsync(async (req: Request, res: Response) => {
  const newMenu = new Menu({
    ...req.body, // Ensure the request body includes parent and other fields
  });

  const savedMenu = await newMenu.save();

  res.json({
    success: true,
    data: savedMenu,
  });
});

// Get menu by ID
const getMenuById = handleAsync(async (req: Request, res: Response) => {
  const menu = await Menu.findById(req.params.id)
    .populate('permission')
    .populate('parent');

  if (!menu) {
    res.status(404);
    throw new Error('Menu not found');
  }

  // Get children of the menu
  const children = await getChildren(req.params.id);

  res.json({
    success: true,
    data: {
      menu: menu.toObject(),
      children,
    },
  });
});

// Update an existing menu
const updateMenu = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedMenu = await Menu.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  )
    .populate('permission')
    .populate('parent');

  if (!updatedMenu) {
    res.status(404);
    throw new Error('Menu not found');
  }

  res.json({
    success: true,
    data: updatedMenu,
  });
});

// Delete a menu by ID
const deleteMenu = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Delete the menu
  const menu = await Menu.findByIdAndDelete(id);

  if (!menu) {
    res.status(404);
    throw new Error('Menu not found');
  }

  res.json({
    success: true,
    data: { message: 'Menu deleted successfully' },
  });
});

// Delete multiple menus by IDs
const deleteMultipleMenus = handleAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;

  // Use Mongoose's deleteMany method for batch deletion
  await Menu.deleteMany({
    _id: { $in: ids },
  });

  res.json({
    success: true,
    message: `${ids.length} menus deleted successfully`,
  });
});

export {
  deleteMultipleMenus,
  updateMenu,
  deleteMenu,
  getMenus,
  addMenu,
  getMenuById,
};
