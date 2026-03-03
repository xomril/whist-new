module.exports = {
  apps: [
    {
      name: 'whist',
      script: './server/dist/index.js',
      cwd: '/home/opc/whist',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      // Auto-restart on crash, cap at 10 restarts/minute
      max_restarts: 10,
      restart_delay: 3000,
      // Log files
      out_file: '/home/opc/whist/logs/out.log',
      error_file: '/home/opc/whist/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
