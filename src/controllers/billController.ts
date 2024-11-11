// controllers/billController.ts
import { Request, Response } from 'express';
import Bill, { IBill } from '../models/bill';
import handleAsync from '../utils/handleAsync';
import path from 'path';

export function getTemplatePath(...subPaths: string[]): string {
  return path.join(process.cwd(), 'src', 'templates', ...subPaths);
}

const getBills = handleAsync(async (req: Request, res: Response) => {
  // 假设这些值来自于请求参数
  const { transactionType } = req.query;

  const query: any = {};

  if (transactionType) {
    query.transactionType = transactionType;
  }
  const bills = await Bill.find(query).exec();

  const incomeBills: IBill[] = bills.filter(
    (bill: IBill) => bill.transactionType === 'income',
  );
  const issueBills: IBill[] = bills.filter(
    (bill: IBill) => bill.transactionType === 'issue',
  );
  const incomeAmount: number = incomeBills.reduce(
    (acc: number, bill: IBill) => acc + bill.amount,
    0,
  );
  const issueAmount: number = issueBills.reduce(
    (acc: number, bill: IBill) => acc + bill.amount,
    0,
  );

  // const total = await Bill.countDocuments(query).exec();

  res.json({
    success: true,
    data: {
      bills,
      rate: '0%',
      fixedRate: 7.12,
      incomeBills,
      issueBills,
      incomeAmount,
      issueAmount,
    },
  });
});

export const fetchBills = handleAsync(async (req: Request, res: Response) => {
  const { transactionType, current = '1', pageSize = '10' } = req.query;

  const query: any = transactionType ? { transactionType } : {};

  const bills = await Bill.find(query)
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await Bill.countDocuments(query).exec();

  res.json({
    success: true,
    data: bills,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

const addBill = handleAsync(async (req: Request, res: Response) => {
  const { amount, transactionType } = req.body;

  const newBill = new Bill({
    amount,
    rate: 0,
    fixedRate: 7.12,
    transactionType,
  });

  const savedBill = await newBill.save();

  res.json({
    success: true,
    data: savedBill,
  });
});

export const createBill = handleAsync(async (req: Request, res: Response) => {
  const newBill = new Bill({
    ...req.body,
  });

  const savedBill = await newBill.save();
  res.status(201).json({ success: true, data: savedBill });
});

const getBillById = handleAsync(async (req: Request, res: Response) => {
  const bill = await Bill.findById(req.params.id);

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  } else {
    res.json({
      success: true,
      data: bill,
    });
  }
});

const updateBill = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, rate, fixedRate, transactionType } = req.body;

  // 寻找账单是否存在
  const bill = await Bill.findById(id);

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  // 更新账单信息
  const updatedBill = await Bill.findByIdAndUpdate(
    id,
    { amount, rate, fixedRate, transactionType },
    { new: true },
  );

  res.json({
    success: true,
    data: updatedBill,
  });
});

const deleteBill = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // 删除账单
  const bill = await Bill.findByIdAndDelete(id);

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  res.json({
    success: true,
    data: { message: 'Bill deleted successfully' },
  });
});

const deleteMultipleBills = handleAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;

  // 使用 Mongoose 的 deleteMany 方法进行批量删除
  await Bill.deleteMany({
    _id: { $in: ids },
  });

  res.json({
    success: true,
    message: `${ids.length} bills deleted successfully`,
  });
});

export {
  deleteMultipleBills,
  updateBill,
  deleteBill,
  getBills,
  addBill,
  getBillById,
};
