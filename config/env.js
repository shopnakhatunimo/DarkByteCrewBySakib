const requiredEnvVars = ['BOT_TOKEN', 'MONGO_URI', 'DOMAIN'];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  validateEnv
};
