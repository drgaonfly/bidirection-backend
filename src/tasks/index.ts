import { updatePoolValues } from './cron/updatePoolValues';
import { checkActivityStatus } from './cron/checkActivityStatus';
import { checkReleaseRecords } from './cron/checkReleaseRecords';
import setupDB from '../utils/db';
import { generateIncome } from './cron/authorized';
import { checkLockDurationAndCreateRelease } from './cron/lockDuration';
import { checkIsOnline } from './cron/checkIsOnline';
import { clearInactiveChats } from './cron/clearChat';

const task = async () => {
  await setupDB();

  await checkActivityStatus();
  await updatePoolValues();
  await checkReleaseRecords();
  await generateIncome();
  await checkLockDurationAndCreateRelease();
  await checkIsOnline();
  await clearInactiveChats();
  process.exit(0);
};

task();
