const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const host = process.env.REDIS_HOST || 'localhost';
let redisClient;

(async () => {
  redisClient = redis.createClient({ port: 6379, host, legacyMode: true });
  redisClient.on('error', (err) => {
    console.log(err);
    process.exit(1);
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis.');
  });

  await redisClient.connect();
})();

module.exports = redisClient;
