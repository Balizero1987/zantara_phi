module.exports = {
  apps: [{
    name: 'zantara-phi',
    script: 'tsx',
    args: 'src/web/server.ts',
    cwd: '/Users/antonellosiano/Desktop/ZANTARA PHI/monastery-stack',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3618
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3618,
      DEBUG: 'zantara:*'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 3000,
    listen_timeout: 3000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};