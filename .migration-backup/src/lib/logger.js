import { config } from '@/lib/config';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[config.app.logLevel] || LOG_LEVELS.info;

function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data }),
    env: config.app.env,
  };
  return JSON.stringify(logEntry);
}

export const logger = {
  debug: (message, data) => {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log(formatLog('DEBUG', message, data));
    }
  },

  info: (message, data) => {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(formatLog('INFO', message, data));
    }
  },

  warn: (message, data) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog('WARN', message, data));
    }
  },

  error: (message, error = null, data = null) => {
    if (currentLevel <= LOG_LEVELS.error) {
      const errorData = {
        ...data,
        ...(error && {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        }),
      };
      console.error(formatLog('ERROR', message, errorData));
    }
  },
};

export class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    this.name = 'AppError';
  }
}

export function errorResponse(error, statusCode = 500) {
  if (config.app.isProduction) {
    return {
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    error: error.message || 'Internal server error',
    statusCode,
    ...(error.context && { context: error.context }),
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };
}

export function handleApiError(error, context = '') {
  logger.error(`API Error: ${context}`, error);

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: errorResponse(error, error.statusCode),
    };
  }

  if (error.name === 'ValidationError') {
    return {
      statusCode: 400,
      body: errorResponse(new AppError('Validation error', 400), 400),
    };
  }

  if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
    logger.error('Database error detected', error);
    return {
      statusCode: 503,
      body: errorResponse(new AppError('Database connection error', 503), 503),
    };
  }

  return {
    statusCode: 500,
    body: errorResponse(new AppError('Internal server error', 500), 500),
  };
}

export default logger;
