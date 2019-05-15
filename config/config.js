var config = require("./config.json");

// set config info to process env
Object.keys(config).forEach(key => (process.env[key] = config[key]));
