const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { validationResult } = require('express-validator');
const redisClient = require('../../config/redis');

const dotenv = require('dotenv');
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'MY_SECRET';

const EXIST_USER = 'Username or email is already taken!';
const RETRY_MESSAGE = 'The server went wrong. Retry again, please.';
const REGISTER_SUCCESS = 'You have registered successfully.';
const INCORRECT_USER = 'Email or password is incorrect.';
const LOGIN_SUCCESS = 'You have logged in successfully.';
const USER_NOT_FOUND = 'User not found.';

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
            return res.redirect(`/register?error=${RETRY_MESSAGE}`);
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
    return res.redirect(`/register?error=${RETRY_MESSAGE}`);
  }
};

exports.login = (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.redirect('/login?error=' + errors.array()[0].msg);
    }

    const { email, password } = req.body;
    let query = 'SELECT * FROM users WHERE email = ?';
    db.execute(query, [email], async (err, result) => {
      if (err) {
        throw err;
      }

      if (result.length === 0) {
        return res.redirect(`/login?error=${INCORRECT_USER}`);
      }

      let user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.redirect(`/login?error=${INCORRECT_USER}`);
      }

      query = 'SELECT user_rank, user_points FROM user_info WHERE user_id = ?';
      db.execute(query, [user.id], (err, result) => {
        if (err) {
          throw err;
        }

        let userInfo = result[0];
        const payload = {
          id: user.id,
          username: user.username,
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
          res.cookie('user_rank', userInfo.user_rank, {
            maxAge: 1000 * 60 * 60 * 24 * 30 * 6,
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
          });
          res.cookie('user_points', userInfo.user_points, {
            maxAge: 1000 * 60 * 60 * 24 * 30 * 6,
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
          });

          res.redirect(`/?success=${LOGIN_SUCCESS}`);
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.redirect(`/login?error=${RETRY_MESSAGE}`);
  }
};

exports.getInfo = (req, res) => {
  try {
    jwt.verify(req.cookies.token, jwtSecret, (err, userPayload) => {
      if (err) throw err;

      const { id, email, username } = userPayload;

      let user = {
        id,
        username,
        email,
        user_rank: req.cookies.user_rank,
        user_points: req.cookies.user_points,
      };

      return res.json(user);
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
