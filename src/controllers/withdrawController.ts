import { Request, Response } from 'express';
import Withdraw from '../models/withdraw';
import handleAsync from '../utils/handleAsync';
import Customer from '../models/customer';
import { IdGen } from '../utils/idGen';
import { getExchangeRate } from '../utils/getExchange';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.customer) {
    query.customer = queryParams.customer;
  }

  return query;
};

// Get all withdraws
const getWithdraws = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const withdraws = await Withdraw.find(query)
    .populate('customer')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Withdraw.countDocuments(query).exec();

  res.json({
    success: true,
    data: withdraws,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// Add new withdraw
const addWithdraw = handleAsync(async (req: Request, res: Response) => {
  const { amount, customer } = req.body;

  const customerExist = await Customer.findById(customer);

  if (!customerExist) {
    res.status(404);
    throw new Error('钱包不存在');
  }

  if (Number(amount) <= 0) {
    res.status(400);
    throw new Error('提现金额不能小于0');
  }

  if (Number(amount) > Number(customerExist.usdtPlatform)) {
    res.status(400);
    throw new Error('USDT余额不足');
  }

  customerExist.usdtPlatform -= amount;

  await customerExist.save();

  const newId = await IdGen.next(Withdraw, 'id', 6);

  const exchangedAmount = amount * (await getExchangeRate('USDT', 'USD'));

  const newWithdraw = new Withdraw({
    ...req.body,
    id: newId,
    customer: customer,
    amount: exchangedAmount,
    status: 'completed',
  });

  const savedWithdraw = await newWithdraw.save();
  res.json({
    success: true,
    data: savedWithdraw,
  });
});

// Get withdraw by ID
const getWithdrawById = handleAsync(async (req: Request, res: Response) => {
  const withdraw = await Withdraw.findById(req.params.id).populate('customer');

  if (!withdraw) {
    res.status(404);
    throw new Error('Withdraw not found');
  }

  res.json({
    success: true,
    data: withdraw,
  });
});

// Update withdraw
const updateWithdraw = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const withdraw = await Withdraw.findById(id);
  if (!withdraw) {
    res.status(404);
    throw new Error('Withdraw not found');
  }

  const updatedWithdraw = await Withdraw.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true, runValidators: true },
  ).populate('customer');

  res.json({
    success: true,
    data: updatedWithdraw,
  });
});

// Delete withdraw
const deleteWithdraw = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const withdraw = await Withdraw.findById(id);
  if (!withdraw) {
    res.status(404);
    throw new Error('Withdraw not found');
  }

  await withdraw.deleteOne();

  res.json({
    success: true,
    message: 'Withdraw deleted successfully',
  });
});

// Delete multiple withdraws
const deleteMultipleWithdraws = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    const result = await Withdraw.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${result.deletedCount} withdraws deleted successfully`,
    });
  },
);

// get withdraw by customer id
const getWithdrawByCustomerId = handleAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const withdraws = await Withdraw.find({ customer: id });

    res.json({
      success: true,
      data: withdraws,
    });
  },
);

// Export controller methods
export {
  deleteMultipleWithdraws,
  updateWithdraw,
  deleteWithdraw,
  getWithdraws,
  addWithdraw,
  getWithdrawById,
  getWithdrawByCustomerId,
};
