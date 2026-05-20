const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ error: 'ValidationError', details });
  }

  // Mongoose duplicate key error (e.g., unique email)
  if (err.code === 11000) {
    const key = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'ValidationError',
      details: [{ field: key, message: `${key} already exists` }],
    });
  }

  // CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: `Invalid ID format for path: ${err.path}`,
    });
  }

  // Default internal server error
  res.status(err.status || 500).json({
    error: err.error || 'InternalServerError',
    message: err.message || 'Something went wrong on the server',
  });
};

module.exports = errorHandler;
