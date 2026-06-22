// PM2 配置文件 - 生产环境
// 使用方式: pm2 start ecosystem.config.js
// 部署更新: pm2 reload ecosystem.config.js

module.exports = {
  apps: [
    // ── 主应用 ────────────────────────────────────────────────
    {
      name: 'bidirection-backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        DEBUG: 'bot*',
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_size: '10M',
      retain: 7,
      compress: true,
    },

    // ── Bot Webhook 注册（每小时 :30 重跑一次设置 Webhook） ───
    {
      name: 'bidirection-bot',
      script: 'dist/bot/index.js',
      instances: 1,
      autorestart: false,   // 执行完即退出，由 cron_restart 定时重启
      watch: false,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      cron_restart: '30 * * * *',
      env: {
        NODE_ENV: 'production',
        DEBUG: 'bot*',
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_size: '10M',
      retain: 7,
      compress: true,
    },

    // ── 通用定时任务：bot 到期检查 + 群发消息 ────────────────
    {
      name: 'bidirection-task',
      script: 'dist/tasks/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        DEBUG: 'cron:task*',
      },
      error_file: './logs/task-error.log',
      out_file: './logs/task-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_size: '10M',
      retain: 7,
      compress: true,
    },

    // ── 话题订阅：USDT 入账扫描，自动续期 ───────────────────
    {
      name: 'bidirection-subscription',
      script: 'dist/tasks/subscription.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        DEBUG: 'cron:subscription*',
      },
      error_file: './logs/subscription-error.log',
      out_file: './logs/subscription-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_size: '10M',
      retain: 7,
      compress: true,
    },

    // ── 话题订阅：到期提醒 + 过期标记 ───────────────────────
    {
      name: 'bidirection-subscription-notify',
      script: 'dist/tasks/subscriptionNotify.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        DEBUG: 'cron:subscriptionNotify*',
      },
      error_file: './logs/subscription-notify-error.log',
      out_file: './logs/subscription-notify-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_size: '10M',
      retain: 7,
      compress: true,
    },
  ],
};
