import { Request, Response } from 'express';
import TeamBenefit from '../models/teamBenefit';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from 'user';

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

// 获取团队收益数据列表
export const getTeamBenefitList = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = buildQuery({
      ...req.query,
    });

    const teamBenefit = await TeamBenefit.find(query)
      .sort({ createdAt: -1 })
      .limit(+pageSize)
      .skip((+current - 1) * +pageSize)
      .exec();

    const total = await TeamBenefit.countDocuments(query);

    res.json({
      success: true,
      data: teamBenefit,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

// 前端获取所有团队收益数据
export const getAllTeamBenefit = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const query = buildQuery({
      ...req.query,
    });

    const teamBenefit = await TeamBenefit.find(query)
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      success: true,
      data: teamBenefit,
    });
  },
);

// 添加团队收益数据
export const addTeamBenefit = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const newTeamBenefit = new TeamBenefit({
      ...req.body,
      createdAt: new Date(),
    });

    const savedTeamBenefit = await newTeamBenefit.save();

    res.status(201).json({
      success: true,
      data: savedTeamBenefit,
    });
  },
);

// 获取单个团队收益数据
export const getTeamBenefitById = handleAsync(
  async (req: Request, res: Response) => {
    const teamBenefit = await TeamBenefit.findById(req.params.id);

    if (!teamBenefit) {
      res.status(404);
      throw new Error('团队收益数据未找到');
    }

    res.json({
      success: true,
      data: teamBenefit,
    });
  },
);

// 更新团队收益数据
export const updateTeamBenefit = handleAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const teamBenefit = await TeamBenefit.findById(id);

    if (!teamBenefit) {
      res.status(404);
      throw new Error('团队收益数据未找到');
    }

    const updatedTeamBenefit = await TeamBenefit.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    res.json({
      success: true,
      data: updatedTeamBenefit,
    });
  },
);

// 删除团队收益数据
export const deleteTeamBenefit = handleAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const teamBenefit = await TeamBenefit.findByIdAndDelete(id);

    if (!teamBenefit) {
      res.status(404);
      throw new Error('团队收益数据未找到');
    }

    res.json({
      success: true,
      data: { message: '团队收益数据删除成功' },
    });
  },
);

// 批量删除团队收益数据
export const deleteMultipleTeamBenefit = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await TeamBenefit.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} 条团队收益数据删除成功`,
    });
  },
);
