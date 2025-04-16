import Customer from '../models/customer';
import setupDB from '../utils/db';

const migrateColumns = async () => {
  await setupDB();

  const customers = await Customer.find();

  for (const customer of customers) {
    await customer.save();
  }
};

migrateColumns()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.log('迁移表数据:', error);
    process.exit(1);
  });
