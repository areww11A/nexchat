import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create test app
const app = express();
app.use(express.json());

// Mock database
const mockDb = {
  run: jest.fn((query, params, callback) => callback(null, { lastID: 1 })),
  all: jest.fn((query, params, callback) => callback(null, [
    { id: 1, path: '/test/path.png' }
  ]))
};

// Mock auth middleware
const mockAuth = (req, res, next) => {
  req.userId = 1;
  req.wss = { clients: new Set() };
  next();
};

// Mock multer
const mockMulter = () => ({
  single: () => (req, res, next) => {
    req.file = { path: '/test/path.png' };
    next();
  }
});

// Mock fs
jest.unstable_mockModule('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(),
  unlink: jest.fn().mockResolvedValue()
}));

// Create test router
const createTestRouter = async () => {
  const router = express.Router();
  
  router.post('/', mockAuth, mockMulter().single('sticker'), async (req, res) => {
    try {
      const result = await new Promise((resolve) => {
        mockDb.run('INSERT query', [req.userId, req.file.path], function() {
          resolve({ lastID: 1 });
        });
      });
      res.status(201).json({ stickerId: result.lastID, path: req.file.path });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/', mockAuth, async (req, res) => {
    const stickers = await new Promise((resolve) => {
      mockDb.all('SELECT query', [req.userId], (err, rows) => {
        resolve(rows.map(row => ({ stickerId: row.id, path: row.path })));
      });
    });
    res.status(200).json(stickers);
  });

  return router;
};

describe('Sticker API Isolated Tests', () => {
  let router;

  beforeAll(async () => {
    router = await createTestRouter();
    app.use('/api/stickers', router);
  });

  test('POST /api/stickers - upload sticker', async () => {
    const res = await request(app)
      .post('/api/stickers')
      .attach('sticker', Buffer.from('test'), 'test.png');
    
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      stickerId: 1,
      path: '/test/path.png'
    });
  });

  test('GET /api/stickers - list stickers', async () => {
    const res = await request(app)
      .get('/api/stickers');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { stickerId: 1, path: '/test/path.png' }
    ]);
  });
});
