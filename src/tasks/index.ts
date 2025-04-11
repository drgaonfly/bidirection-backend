import { updatePoolValues } from './cron/updatePoolValues';
import { checkActivityStatus } from './cron/checkActivityStatus';
import { checkReleaseRecords } from './cron/checkReleaseRecords';
import setupDB from '../utils/db';
import { generateFlowingIncome } from './cron/authorized';
import { generateStakingIncome } from './cron/stacking';

const task = async () => {
  await setupDB();

  await checkActivityStatus();
  await updatePoolValues();
  await checkReleaseRecords();
  await generateFlowingIncome();
  await generateStakingIncome();
  process.exit(0);
};

task();
