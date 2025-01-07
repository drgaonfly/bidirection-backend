import { Request, Response } from 'express';
import Channel from '../models/channel';
import handleAsync from '../utils/handleAsync';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.customer) {
    query.customer = queryParams.customer;
  }

  if (queryParams.channelCode) {
    query.channelCode = { $regex: new RegExp(queryParams.channelCode, 'i') };
  }

  if (queryParams.agentUser) {
    query.agentUser = { $regex: new RegExp(queryParams.agentUser, 'i') };
  }

  return query;
};

// 获取所有频道记录
const getChannels = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const channels = await Channel.find(query)
    .populate('customer') // 如果需要填充客户信息
    .sort('-updatedAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Channel.countDocuments(query).exec();

  res.json({
    success: true,
    data: channels,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 添加频道记录
const addChannel = handleAsync(async (req: Request, res: Response) => {
  const newChannel = new Channel({
    ...req.body,
  });

  const savedChannel = await newChannel.save();
  res.json({
    success: true,
    data: savedChannel,
  });
});

// 根据 ID 获取频道记录
const getChannelById = handleAsync(async (req: Request, res: Response) => {
  const channel = await Channel.findById(req.params.id).populate('customer');

  res.json({
    success: true,
    data: channel,
  });
});

// 更新频道记录
const updateChannel = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedChannel = await Channel.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true, runValidators: true },
  );

  res.json({
    success: true,
    data: updatedChannel,
  });
});

// 删除频道记录
const deleteChannel = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const channel = await Channel.findByIdAndDelete(id);

  res.json({
    success: true,
    message: channel,
  });
});

// 批量删除频道记录
const deleteMultipleChannels = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Channel.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} channels deleted successfully`,
    });
  },
);

// 导出控制器方法
export {
  deleteMultipleChannels,
  updateChannel,
  deleteChannel,
  getChannels,
  addChannel,
  getChannelById,
};
