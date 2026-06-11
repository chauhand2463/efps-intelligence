module.exports = {
  apps: [{
    name: 'efps-backend',
    script: 'dist/src/server.js',
    instances: process.env.PM2_INSTANCES || -1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    max_memory_restart: '512M',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 10000,
    wait_ready: true,
    listen_timeout: 8000,
  }],
};
