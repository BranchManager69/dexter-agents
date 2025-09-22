module.exports = {
  apps: [
    {
      name: "dexter-agents",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 0.0.0.0 --port 3210",
      interpreter: "/home/branchmanager/.nvm/versions/node/v20.19.1/bin/node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      combine_logs: true,
      error_file: `${__dirname}/logs/dexter-agents.log`,
      out_file: `${__dirname}/logs/dexter-agents.log`,
    },
  ],
};
