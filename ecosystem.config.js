module.exports = {
  apps: [
    {
      name: 'bgalin-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/bgalin/frontend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/bgalin-frontend-error.log',
      out_file: '/var/log/pm2/bgalin-frontend-out.log',
      log_file: '/var/log/pm2/bgalin-frontend-combined.log',
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
