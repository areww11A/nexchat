import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as profileController from '../controllers/profile.controller';
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate,
  handleValidationErrors,
} from '../utils/validation';
import multer from 'multer';

const router = Router();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  },
});

// Debug routes
router.get('/check-schema', authController.checkSchema);

// Auth routes
router.post('/register', validateRegistration, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/logout', authController.logout);
router.patch('/password', validatePasswordChange, handleValidationErrors, authController.changePassword);
router.post('/recover', authController.recoverPassword);
router.post('/reset-password', authController.resetPasswordWithCode);

// Profile routes
router.get('/profile', profileController.getProfile);
router.patch('/profile', validateProfileUpdate, handleValidationErrors, profileController.updateProfile);
router.get('/user/:id', profileController.getUserProfile);
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
