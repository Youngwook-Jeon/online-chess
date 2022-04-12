const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { validationResult } = require('express-validator');
const redisClient = require('../../config/redis');

const dotenv = require('dotenv');
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'MY_SECRET';

const PASSWORD_NOT_MATCH = 'Passwords do not match!';
const EXIST_USER = 'Username or email is already taken!';
const RETRY_MESSAGE = 'The server went wrong. Retry again, please.';
const REGISTER_SUCCESS = 'You have registered successfully.';

exports.register = (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.redirect('/register?error=' + errors.array()[0].msg);
    }

    const { username, email, password } = req.body;

    let query = 'SELECT id FROM users WHERE username = ? or email = ?';
    db.execute(query, [username, email], async (err, result) => {
      if (err) {
        throw err;
      }

      if (result.length > 0) {
        return res.redirect(`/register?error=${EXIST_USER}`);
      }

      const encryptedPassword = await bcrypt.hash(password, 16);
      query = `CALL createUser('${username}', '${email}', '${encryptedPassword}')`;
      db.execute(query, (err) => {
        if (err) throw err;

        query = 'SELECT id FROM users WHERE email = ?';
        db.execute(query, [email], (err, result) => {
          if (err) throw err;

          if (result.length === 0) {
            return res.redirect(`/?error=${RETRY_MESSAGE}`);
          }

          let userId = result[0].id;

          const payload = {
            id: userId,
            username,
            email,
          };

          jwt.sign(payload, jwtSecret, (err, token) => {
            if (err) throw err;

            res.cookie('token', token, {
              maxAge: 1000 * 60 * 60 * 24 * 30 * 6,
              httpOnly: true,
              secure: false,
              sameSite: 'strict',
            });
            res.cookie('user_rank', 'beginner', {
              maxAge: 1000 * 60 * 60 * 24 * 30 * 6,
              httpOnly: true,
              secure: false,
              sameSite: 'strict',
            });
            res.cookie('user_points', 1000, {
              maxAge: 1000 * 60 * 60 * 24 * 30 * 6,
              httpOnly: true,
              secure: false,
              sameSite: 'strict',
            });

            res.redirect(`/?success=${REGISTER_SUCCESS}`);
          });
        });
      });
    });
  } catch (error) {
    console.log(error);
    return res.redirect(`/?error=${RETRY_MESSAGE}`);
  }
};
