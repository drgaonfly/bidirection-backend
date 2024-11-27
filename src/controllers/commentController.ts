import { Request, Response } from 'express';
import Comment from '../models/comment';
import Customer from '../models/customer';
import handleAsync from '../utils/handleAsync';

// 构建查询条件
const buildQuery = async (queryParams: any): Promise<any> => {
  const query: any = {};

  // 通过客户名称查询（关联查询）
  if (queryParams.customer) {
    let searchText;
    try {
      // 尝试解析 JSON
      const customerParam = JSON.parse(String(queryParams.customer));
      searchText = customerParam.username; // 获取 username 字段
    } catch (e) {
      // 如果不是 JSON，直接使用原值
      searchText = String(queryParams.customer).trim();
    }

    console.log('搜索文本:', searchText);

    const customerData = await Customer.find({
      username: {
        $regex: searchText,
        $options: 'i',
      },
    });

    if (customerData && customerData.length > 0) {
      query.customer = { $in: customerData.map((customer) => customer._id) };
      console.log('查询条件:', query.customer);
    } else {
      console.log('未找到匹配的客户');
      return null;
    }
  }

  // 评论内容模糊查询
  if (queryParams.content) {
    query.content = {
      $regex: queryParams.content,
      $options: 'i', // 不区分大小写
    };
  }

  // 评分查询
  if (queryParams.rating) {
    query.rating = Number(queryParams.rating); // 精确匹配评分
  } else if (queryParams.minRating || queryParams.maxRating) {
    query.rating = {};
    if (queryParams.minRating) {
      query.rating.$gte = Number(queryParams.minRating);
    }
    if (queryParams.maxRating) {
      query.rating.$lte = Number(queryParams.maxRating);
    }
  }

  return query;
};

// 获取评论列表
const getComments = handleAsync(async (req: Request, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query);

  // 如果 username 查询没有匹配结果，直接返回空数据
  if (query === null) {
    res.json({
      success: true,
      data: [],
      total: 0,
      current: +current,
      pageSize: +pageSize,
    });
    return;
  }

  const comments = await Comment.find(query)
    .populate('customer', 'username _id')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .lean()
    .exec();

  const formattedComments = comments.map((comment) => ({
    ...comment,
    ratingStars: '⭐'.repeat(comment.rating),
  }));

  const total = await Comment.countDocuments(query).exec();

  res.json({
    success: true,
    data: formattedComments,
    total,
    current: +current,
    pageSize: +pageSize,
  });
  return;
});

// 创建新评论
const addComment = handleAsync(async (req: Request, res: Response) => {
  const { customer, content, rating } = req.body;

  try {
    // 检查客户是否存在
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      res.status(404);
      throw new Error('客户不存在');
    }

    const comment = await Comment.create({
      customer,
      content,
      rating: Number(rating),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'customer',
      'username',
    );

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// 获取单个评论
const getCommentById = handleAsync(async (req: Request, res: Response) => {
  const comment = await Comment.findById(req.params.id).populate(
    'customer',
    'username',
  );

  if (!comment) {
    res.status(404);
    throw new Error('评论不存在');
  }

  res.json({
    success: true,
    data: comment,
  });
});

// 更新评论
const updateComment = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, rating } = req.body;

  try {
    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404);
      throw new Error('评论不存在');
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      {
        content,
        rating: Number(rating),
      },
      { new: true, runValidators: true },
    ).populate('customer', 'username');

    res.json({
      success: true,
      data: updatedComment,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// 删除评论
const deleteComment = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const comment = await Comment.findByIdAndDelete(id);

  if (!comment) {
    res.status(404);
    throw new Error('评论不存在');
  }

  res.json({
    success: true,
    data: { message: '评论删除成功' },
  });
});

// 批量删除评论
const deleteMultipleComments = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await Comment.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 条评论`,
    });
  },
);

export {
  getComments,
  addComment,
  getCommentById,
  updateComment,
  deleteComment,
  deleteMultipleComments,
};
