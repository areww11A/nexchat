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

const router = Router();

// Auth routes
router.post('/register', validateRegistration, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/logout', authController.logout);
router.patch('/password', validatePasswordChange, handleValidationErrors, authController.changePassword);

// Profile routes
router.get('/profile', profileController.getProfile);
router.patch('/profile', validateProfileUpdate, handleValidationErrors, profileController.updateProfile);
router.get('/user/:id', profileController.getUserProfile);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router; 