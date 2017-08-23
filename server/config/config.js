var env = process.env.NODE_ENV || 'development';

var config = require('./config.json');

if (env === 'development' || env === "test") {
  var envConfig = config[env];

  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  })
}

var envConfig = config['crypto'];
Object.keys(envConfig).forEach((key) => {
  process.env[key] = envConfig[key];
})
