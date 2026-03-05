module.exports = {
  apps: [{
    name: "dlchats-app",
    script: "./server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3005,
      DATABASE_DIR: "/var/www/dlchats-app"
    },
    watch: false,
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    time: true
  }]
};
