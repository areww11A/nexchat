const jwt = require('jsonwebtoken');

// Используем тот же секрет, что и в Auth Service
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; 

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Добавляем алгоритм подписи явно
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};
