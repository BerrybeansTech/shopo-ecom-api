const errorHandler = (err, req, res, next) => {
 
  console.error("Unhandled error:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
  });

  let status = 500;
  let message = 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message || 'Validation failed';
  } else if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    status = 400;
    message = err.errors?.length > 0 
      ? err.errors.map(e => e.message).join(', ')
      : 'Database validation error';
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  } else if (err.name === 'MulterError') {
    // Handle Multer file upload errors cleanly
    status = 400;
    if (err.code === 'LIMIT_FILE_COUNT') {
      message = `Too many files uploaded. Maximum allowed is ${err.field ? 'exceeded for "' + err.field + '"' : 'exceeded'}.`;
    } else if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Please upload a smaller file.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected file field: ${err.field}`;
    } else {
      message = err.message || 'File upload error';
    }
  } else if (err.status) {
    status = err.status;
    message = err.message;
  }


  if (process.env.NODE_ENV === 'production') {
    message = status >= 500 ? 'Internal server error' : message;
  }

  res.status(status).json({
    success: false,
    message, 
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
};

module.exports = { errorHandler };