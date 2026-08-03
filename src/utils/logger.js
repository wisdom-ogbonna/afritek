/**
 * Simple structured logger utility
 * In production you may replace this with winston, pino, or similar.
 */

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel =
  process.env.NODE_ENV === 'production' ? levels.info : levels.debug;

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString =
    Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
};

const logger = {
  error(message, meta = {}) {
    if (currentLevel >= levels.error) {
      console.error(formatMessage('error', message, meta));
    }
  },

  warn(message, meta = {}) {
    if (currentLevel >= levels.warn) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  info(message, meta = {}) {
    if (currentLevel >= levels.info) {
      console.info(formatMessage('info', message, meta));
    }
  },

  debug(message, meta = {}) {
    if (currentLevel >= levels.debug) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};

module.exports = logger;
