import { Request, Response } from 'express';
import Transfer from '../models/transfer';
import Exchange from '../models/exchange';
import handleAsync from '../utils/handleAsync';

const buildQuery = async (queryParams: any): Promise<any> => {
  const query: any = {};

  if (queryParams.exchange) {
    const exchangeData = await Exchange.find({
      id: queryParams.exchange,
    });

    if (exchangeData && exchangeData.length > 0) {
      query.exchange = { $in: exchangeData.map((e) => e._id) };
    } else {
      query.exchange = null;
    }
  }

  // hash
  if (queryParams.hash) {
    query.hash = queryParams.hash;
  }

  // txid
  if (queryParams.txid) {
    query.txid = queryParams.txid;
  }

  // from
  if (queryParams.from) {
    query.from = queryParams.from;
  }

  // to
  if (queryParams.to) {
    query.to = queryParams.to;
  }

  // status
  if (queryParams.status) {
    query.status = queryParams.status;
  }

  return query;
};

export const getTransfers = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query);

  const transfers = await Transfer.find(query)
    .sort('-createdAt')
    .populate('exchange')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .lean()
    .exec();

  const total = await Transfer.countDocuments(query).exec();

  res.json({
    success: true,
    data: transfers,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

export const getTransferById = handleAsync(
  async (req: Request, res: Response) => {
    const transfer = await Transfer.findOne({
      _id: req.params.id,
    }).lean();

    if (!transfer) {
      res.status(404);
      throw new Error('转账记录未找到');
    }

    res.json({
      success: true,
      data: transfer,
    });
  },
);

export const addTransfer = handleAsync(async (req: Request, res: Response) => {
  const transfer = new Transfer({
    ...req.body,
    createdAt: new Date(),
  });

  const savedTransfer = await transfer.save();

  res.status(201).json({
    success: true,
    data: savedTransfer,
  });
});

export const updateTransfer = handleAsync(
  async (req: Request, res: Response) => {
    const transfer = await Transfer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!transfer) {
      res.status(404);
      throw new Error('转账记录未找到');
    }

    res.json({
      success: true,
      data: transfer,
    });
  },
);

export const deleteTransfer = handleAsync(
  async (req: Request, res: Response) => {
    const transfer = await Transfer.deleteOne({
      _id: req.params.id,
    });

    if (!transfer) {
      res.status(404);
      throw new Error('转账记录未找到');
    }

    res.json({
      success: true,
      message: '转账记录已删除',
    });
  },
);

export const deleteMultipleTransfers = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Transfer.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '转账记录批量删除成功',
    });
  },
);
