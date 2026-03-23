require('dotenv').config();
const path = require('path');
const fs   = require('fs');

const DATA_DIR = process.env.SWIK_DATA_DIR
  || path.join(require('os').homedir(), '.config', 'swik');

fs.mkdirSync(DATA_DIR, { recursive: true });

const config = {
  port:        parseInt(process.env.PORT         || '7843', 10),
  frontendUrl: process.env.FRONTEND_URL          || 'http://localhost:5175',
  nodeEnv:     process.env.NODE_ENV              || 'development',
  dataDir:     DATA_DIR,
  isDesktop:   !!process.env.SWIK_IS_DESKTOP,

  ai: {
    defaultProvider: process.env.SWIK_DEFAULT_PROVIDER || 'ollama',
    defaultModel:    process.env.SWIK_DEFAULT_MODEL    || 'llama3.2',

    ollama: {
      url:   process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.SWIK_DEFAULT_MODEL || 'llama3.2',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      url:    'https://api.groq.com/openai',
      model:  'llama-3.3-70b-versatile',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      url:    'https://api.openai.com',
      model:  'gpt-4o-mini',
    },
    custom: {
      apiKey: process.env.OPENAI_COMPAT_KEY || '',
      url:    process.env.OPENAI_COMPAT_URL || '',
      model:  process.env.OPENAI_COMPAT_MODEL || '',
    },
  },

  scanIntervalMinutes: parseInt(process.env.SCAN_INTERVAL_MINUTES || '30', 10),
  timezone:            process.env.TIMEZONE || 'Asia/Kolkata',
};

module.exports = config;
