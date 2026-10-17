module.exports = {
  apps: [
    {
      name: 'balak-server',
      cwd: '/www/wwwroot/balak-dev',
      script: './node_modules/tsx/dist/cli.mjs',
      args: 'server/index.ts',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'balak-web',
      cwd: '/www/wwwroot/balak-dev',
      script: './node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
    },
  ],
};
