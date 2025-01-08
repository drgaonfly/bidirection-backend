import { Request, Response } from 'express';
import Transaction from '../models/transaction';
import handleAsync from '../utils/handleAsync';

const buildQuery = (queryParams: any): any => {
  const query: any = {};

  if (queryParams.type) {
    query.type = queryParams.type;
  }

  if (queryParams.wallet) {
    query.wallet = queryParams.wallet;
  }

  if (queryParams.transactedBalance) {
    query.transactedBalance = queryParams.transactedBalance;
  }

  return query;
};

const getTransactions = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = buildQuery(req.query);

  const transactions = await Transaction.find(query)
    .populate('wallet')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Transaction.countDocuments(query).exec();

  res.json({
    success: true,
    data: transactions,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

const addTransaction = handleAsync(async (req: Request, res: Response) => {
  const newTransaction = new Transaction({
    ...req.body,
  });

  const savedTransaction = await newTransaction.save();
  res.json({
    success: true,
    data: savedTransaction,
  });
});

const getTransactionById = handleAsync(async (req: Request, res: Response) => {
  const transaction = await Transaction.findById(req.params.id).populate(
    'wallet',
  );

  res.json({
    success: true,
    data: transaction,
  });
});

const updateTransaction = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedTransaction = await Transaction.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true, runValidators: true },
  );

  res.json({
    success: true,
    data: updatedTransaction,
  });
});

const deleteTransaction = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const transaction = await Transaction.findByIdAndDelete(id);

  res.json({
    success: true,
    message: transaction,
  });
});

const deleteMultipleTransactions = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Transaction.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `${ids.length} Transactions deleted successfully`,
    });
  },
);

export {
  getTransactions,
  addTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  deleteMultipleTransactions,
};
