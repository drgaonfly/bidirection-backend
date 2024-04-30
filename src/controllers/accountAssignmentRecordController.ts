import { Request, Response } from 'express';
import AccountAssignmentRecord, { IAccountAssignmentRecord } from '../models/accountAssignmentRecord';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from 'user';

// Create a new AccountAssignmentRecord
export const createAccountAssignmentRecord = handleAsync(async (req: RequestCustom, res: Response) => {
  const record: IAccountAssignmentRecord = new AccountAssignmentRecord({
    ...req.body,
    user: req.body.user || req.user._id, //
  });
  const savedRecord = await record.save();
  res.status(201).json({ success: true, data: savedRecord });
});

// Get all AccountAssignmentRecords
export const getAllAccountAssignmentRecords = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10', country, platform, storeAccount, assignedTime } = req.query;

  const queryConditions: any = {};
  if (country) queryConditions.country = country;
  if (platform) queryConditions.platform = platform;
  if (assignedTime) queryConditions.assignedTime = assignedTime;
  if (storeAccount) queryConditions.storeAccount = storeAccount;

  const currentNum = parseInt(current as string, 10);
  const pageSizeNum = parseInt(pageSize as string, 10);

  const total = await AccountAssignmentRecord.countDocuments(queryConditions);
  const records = await AccountAssignmentRecord.find(queryConditions)
    .sort('-createdAt')  // Add this line to sort by creation time in descending order
    .skip((currentNum - 1) * pageSizeNum)
    .limit(pageSizeNum)
    .populate('user')
    .populate('accountLibrary');

  res.status(200).json({
    success: true,
    data: records,
    total,
    current: currentNum,
    pageSize: pageSizeNum
  });
});

// Get a single AccountAssignmentRecord by ID
export const getAccountAssignmentRecordById = handleAsync(async (req: Request, res: Response) => {
  const record = await AccountAssignmentRecord.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error('Record not found');
  }
  res.status(200).json({ success: true, data: record });
});

// Update an AccountAssignmentRecord by ID
export const updateAccountAssignmentRecord = handleAsync(async (req: Request, res: Response) => {
  const record = await AccountAssignmentRecord.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!record) {
    res.status(404);
    throw new Error('Record not found');
  }
  res.status(200).json({ success: true, data: record });
});

// Delete an AccountAssignmentRecord by ID
export const deleteAccountAssignmentRecord = handleAsync(async (req: Request, res: Response) => {
  const record = await AccountAssignmentRecord.findByIdAndDelete(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error('Record not found');
  }
  res.status(200).json({ success: true, data: {} });
});