// src/controllers/taskController.ts
import { Request, Response } from 'express';
import handleAsync from '../utils/handleAsync'; // Adjust the import path as necessary
import Task from '../models/task';

export const createTask = handleAsync(async (req: Request, res: Response) => {
  const task = new Task(req.body);
  const savedTask = await task.save();
  res.status(201).json({ success: true, data: savedTask });
});

export const getAllTasks = handleAsync(async (req: Request, res: Response) => {
  const tasks = await Task.find();
  res.status(200).json({ success: true, data: tasks });
});

export const getTaskById = handleAsync(async (req: Request, res: Response) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  res.status(200).json({ success: true, data: task });
});

export const updateTask = handleAsync(async (req: Request, res: Response) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  res.status(200).json({ success: true, data: task });
});

export const deleteTask = handleAsync(async (req: Request, res: Response) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  res.status(200).json({ success: true, message: 'Task successfully deleted' });
});

export const deleteMultipleTasks = handleAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    res.status(400);
    throw new Error('Invalid request: No IDs provided');
  }

  const result = await Task.deleteMany({
    _id: { $in: ids },
  });

  if (result.deletedCount === 0) {
    res.status(404);
    throw new Error('No tasks found to delete');
  }

  res.json({
    success: true,
    message: `${result.deletedCount} tasks deleted successfully`,
    data: { deletedCount: result.deletedCount } // Optionally include more detailed data
  });
});
