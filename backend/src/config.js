// config.js — single source of truth for all runtime configuration
// Values come from environment variables with sensible defaults.

export const config = {
  ollama: {
    url:   process.env.OLLAMA_URL   || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2'
  },
  agent: {
    scanIntervalMinutes: parseInt(process.env.SCAN_INTERVAL_MINUTES || '30', 10),
    timezone: process.env.TIMEZONE || 'Asia/Kolkata'
  },
  server: {
    port:        parseInt(process.env.PORT || '3001', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
  }
};
