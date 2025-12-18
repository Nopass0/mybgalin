module.exports = {
  apps: [
    {
      name: 'bgalin-backend',
      script: 'bun',
      args: 'run src/index.ts',
      cwd: '/var/www/bgalin/server',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      error_file: '/var/log/pm2/bgalin-backend-error.log',
      out_file: '/var/log/pm2/bgalin-backend-out.log',
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'bgalin-frontend',
      script: 'node',
      args: 'server.js',
      cwd: '/var/www/bgalin/frontend/.next/standalone',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      error_file: '/var/log/pm2/bgalin-frontend-error.log',
      out_file: '/var/log/pm2/bgalin-frontend-out.log',
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
