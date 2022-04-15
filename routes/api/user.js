const { Router } = require('express');
const { check } = require('express-validator');
const { register, login, getInfo } = require('../../controllers/api/user');
const router = Router();

const USERNAME_REQUIRED = 'Username is required.';
const EMAIL_REQUIRED = 'Email is required.';
const EMAIL_NOT_VALID = 'Please enter a valid email.';
const PASSWORD_REQUIRED = 'Password is required.';
const CONFIRMPASSWORD_REQUIRED = 'Please confirm your password.';

router.post(
  '/register',
  [
    check('username', USERNAME_REQUIRED).notEmpty(),
    check('email', EMAIL_REQUIRED).notEmpty(),
    check('email', EMAIL_NOT_VALID).isEmail(),
    check('password', PASSWORD_REQUIRED).notEmpty(),
    check('confirmPassword', CONFIRMPASSWORD_REQUIRED).notEmpty(),
    check('confirmPassword')
      .custom(async (confirmPassword, { req }) => {
        const password = req.body.password;
        if (password !== confirmPassword) {
          throw new Error('Passwords must be same');
        }
      }),
  ],
  register
);

router.post(
  '/login',
  [
    check('email', EMAIL_REQUIRED).notEmpty(),
    check('email', EMAIL_NOT_VALID).isEmail(),
    check('password', PASSWORD_REQUIRED).notEmpty(),
  ],
  login
);

router.get("/user-info", getInfo);

module.exports = router;
