import { Request, Response } from 'express';
import Member from '../models/member';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from 'user';
import { IdGen } from '../utils/idGen';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.address) {
    query.address = { $regex: queryParams.address, $options: 'i' };
  }

  if (queryParams.network) {
    query.network = queryParams.network;
  }

  return query;
};

// 获取成员列表
export const getMembers = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = buildQuery({
      ...req.query,
      user: req.user,
      getAllData: req.getAllData,
    });

    const members = await Member.find(query)
      .populate('channel')
      .populate('proxy')
      .sort('-createdAt')
      .limit(+pageSize)
      .skip((+current - 1) * +pageSize)
      .exec();

    const total = await Member.countDocuments(query);

    res.json({
      success: true,
      data: members,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const addMember = handleAsync(
  async (req: RequestCustom, res: Response) => {
    // 查找是否存在相同地址的成员
    const existingMember = await Member.findOne({ address: req.body.address });

    if (existingMember) {
      // 如果成员已存在，更新登录时间并返回现有成员信息
      const updatedMember = await Member.findByIdAndUpdate(
        existingMember._id,
        {
          logedinAt: new Date(),
          // 可以在这里更新其他需要更新的字段
        },
        { new: true },
      )
        .populate('channel')
        .populate('proxy');

      res.json({
        success: true,
        data: updatedMember,
        isNewMember: false, // 标记这是现有成员
      });
      return;
    }

    // 如果成员不存在，创建新成员
    const newId = await IdGen.next(Member, 'id', 6);

    const newMember = new Member({
      ...req.body,
      id: newId,
      createdAt: new Date(),
      logedinAt: new Date(),
    });

    const savedMember = await newMember.save();

    // 返回新创建的成员信息
    res.status(201).json({
      success: true,
      data: savedMember,
      isNewMember: true, // 标记这是新成员
    });
  },
);

// 获取单个成员
export const getMemberById = handleAsync(
  async (req: Request, res: Response) => {
    const member = await Member.findById(req.params.id)
      .populate('channel')
      .populate('proxy');

    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    res.json({
      success: true,
      data: member,
    });
  },
);

// 更新成员
export const updateMember = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const member = await Member.findById(id);

  if (!member) {
    res.status(404);
    throw new Error('成员未找到');
  }

  // 如果更新登录信息
  if (updateData.logedinAt) {
    updateData.LogedinIP =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
  }

  const updatedMember = await Member.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  res.json({
    success: true,
    data: updatedMember,
  });
});

// 删除成员
export const deleteMember = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const member = await Member.findByIdAndDelete(id);

  if (!member) {
    res.status(404);
    throw new Error('成员未找到');
  }

  res.json({
    success: true,
    data: { message: 'Member deleted successfully' },
  });
});

// 批量删除成员
export const deleteMultipleMembers = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Member.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} members deleted successfully`,
    });
  },
);
