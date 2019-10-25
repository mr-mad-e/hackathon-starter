const passport = require('passport');
const refresh = require('passport-oauth2-refresh');
const axios = require('axios');
const { Strategy: LocalStrategy } = require('passport-local');
const { OAuth2Strategy: GoogleStrategy } = require('passport-google-oauth');
const { Strategy: OpenIDStrategy } = require('passport-openid');
const { OAuthStrategy, OAuth2Strategy } = require('passport-oauth');
const _ = require('lodash');
const moment = require('moment');
const strategies = require('./strategies');

const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  User.findOne({ email: email.toLowerCase() }, (err, user) => {
    if (err) { return done(err); }
    if (!user) {
      return done(null, false, { msg: `Email ${email} not found.` });
    }
    if (!user.password) {
      return done(null, false, { msg: 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.' });
    }
    user.comparePassword(password, (err, isMatch) => {
      if (err) { return done(err); }
      if (isMatch) {
        return done(null, user);
      }
      return done(null, false, { msg: 'Invalid email or password.' });
    });
  });
}));

/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

for (let index = 0; index < strategies.length; index++) {
  const strategy = strategies[index];
  const { Strategy: Strategy } = require(strategy.package);

  passport.use(strategy.name, new Strategy({ ...strategy.options, passReqToCallback: true }, (req, accessToken, refreshToken, profile, done) => {
    if (req.user) {
      User.findOne({ ['strategies.' + strategy.name]: profile.id }, (err, existingUser) => {
        if (err) { return done(err); }
        if (existingUser) {
          req.flash('errors', { msg: `There is already a ${strategy.label} account that belongs to you. Sign in with that account or delete it, then link it with your current account.` });
          done(err);
        } else {
          User.findById(req.user.id, (err, user) => {
            if (err) { return done(err); }
            user.strategies[strategy.name] = profile.id;
            user.tokens.push({ kind: strategy.name, accessToken });
            if (typeof strategy.mapUser == 'function') {
              strategy.mapUser(user, profile);
            }

            user.markModified('strategies');

            user.save((err) => {
              req.flash('info', { msg: `${strategy.label} account has been linked.` });
              done(err, user);
            });
          });
        }
      });
    } else {
      User.findOne({ ['strategies.' + strategy.name]: profile.id }, (err, existingUser) => {
        if (err) { return done(err); }
        if (existingUser) {
          return done(null, existingUser);
        }
        const user = new User();
        user.strategies[strategy.name] = profile.id;
        user.tokens.push({ kind: strategy.name, accessToken });
        if (strategy.mapUser) {
          strategy.mapUser(user, profile);
        }
        user.save((err) => {
          done(err, user);
        });
      });
    }
  }));
}

/**
 * Sign in with Google.
 */
const googleStrategyConfig = new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: '/auth/google/callback',
  passReqToCallback: true
}, (req, accessToken, refreshToken, params, profile, done) => {
  if (req.user) {
    User.findOne({ google: profile.id }, (err, existingUser) => {
      if (err) { return done(err); }
      if (existingUser && (existingUser.id !== req.user.id)) {
        req.flash('errors', { msg: 'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
        done(err);
      } else {
        User.findById(req.user.id, (err, user) => {
          if (err) { return done(err); }
          user.google = profile.id;
          user.tokens.push({
            kind: 'google',
            accessToken,
            accessTokenExpires: moment().add(params.expires_in, 'seconds').format(),
            refreshToken,
          });
          user.profile.name = user.profile.name || profile.displayName;
          user.profile.gender = user.profile.gender || profile._json.gender;
          user.profile.picture = user.profile.picture || profile._json.picture;
          user.save((err) => {
            req.flash('info', { msg: 'Google account has been linked.' });
            done(err, user);
          });
        });
      }
    });
  } else {
    User.findOne({ google: profile.id }, (err, existingUser) => {
      if (err) { return done(err); }
      if (existingUser) {
        return done(null, existingUser);
      }
      User.findOne({ email: profile.emails[0].value }, (err, existingEmailUser) => {
        if (err) { return done(err); }
        if (existingEmailUser) {
          req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.' });
          done(err);
        } else {
          const user = new User();
          user.email = profile.emails[0].value;
          user.google = profile.id;
          user.tokens.push({
            kind: 'google',
            accessToken,
            accessTokenExpires: moment().add(params.expires_in, 'seconds').format(),
            refreshToken,
          });
          user.profile.name = profile.displayName;
          user.profile.gender = profile._json.gender;
          user.profile.picture = profile._json.picture;
          user.save((err) => {
            done(err, user);
          });
        }
      });
    });
  }
});
passport.use('google', googleStrategyConfig);
refresh.use('google', googleStrategyConfig);

/**
 * Tumblr API OAuth.
 */
passport.use('tumblr', new OAuthStrategy({
  requestTokenURL: 'https://www.tumblr.com/oauth/request_token',
  accessTokenURL: 'https://www.tumblr.com/oauth/access_token',
  userAuthorizationURL: 'https://www.tumblr.com/oauth/authorize',
  consumerKey: process.env.TUMBLR_KEY,
  consumerSecret: process.env.TUMBLR_SECRET,
  callbackURL: '/auth/tumblr/callback',
  passReqToCallback: true
},
  (req, token, tokenSecret, profile, done) => {
    User.findById(req.user._id, (err, user) => {
      if (err) { return done(err); }
      user.tokens.push({ kind: 'tumblr', accessToken: token, tokenSecret });
      user.save((err) => {
        done(err, user);
      });
    });
  }));

/**
 * Foursquare API OAuth.
 */
passport.use('foursquare', new OAuth2Strategy({
  authorizationURL: 'https://foursquare.com/oauth2/authorize',
  tokenURL: 'https://foursquare.com/oauth2/access_token',
  clientID: process.env.FOURSQUARE_ID,
  clientSecret: process.env.FOURSQUARE_SECRET,
  callbackURL: process.env.FOURSQUARE_REDIRECT_URL,
  passReqToCallback: true
},
  (req, accessToken, refreshToken, profile, done) => {
    User.findById(req.user._id, (err, user) => {
      if (err) { return done(err); }
      user.tokens.push({ kind: 'foursquare', accessToken });
      user.save((err) => {
        done(err, user);
      });
    });
  }));

/**
 * Steam API OpenID.
 */
passport.use(new OpenIDStrategy({
  apiKey: process.env.STEAM_KEY,
  providerURL: 'http://steamcommunity.com/openid',
  returnURL: `${process.env.BASE_URL}/auth/steam/callback`,
  realm: `${process.env.BASE_URL}/`,
  stateless: true,
  passReqToCallback: true,
}, (req, identifier, done) => {
  const steamId = identifier.match(/\d+$/)[0];
  const profileURL = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_KEY}&steamids=${steamId}`;

  if (req.user) {
    User.findOne({ steam: steamId }, (err, existingUser) => {
      if (err) { return done(err); }
      if (existingUser) {
        req.flash('errors', { msg: 'There is already an account associated with the SteamID. Sign in with that account or delete it, then link it with your current account.' });
        done(err);
      } else {
        User.findById(req.user.id, (err, user) => {
          if (err) { return done(err); }
          user.steam = steamId;
          user.tokens.push({ kind: 'steam', accessToken: steamId });
          axios.get(profileURL)
            .then((res) => {
              const profile = res.data.response.players[0];
              user.profile.name = user.profile.name || profile.personaname;
              user.profile.picture = user.profile.picture || profile.avatarmedium;
              user.save((err) => {
                done(err, user);
              });
            })
            .catch((err) => {
              user.save((err) => { done(err, user); });
              done(err, null);
            });
        });
      }
    });
  } else {
    axios.get(profileURL)
      .then(({ data }) => {
        const profile = data.response.players[0];
        const user = new User();
        user.steam = steamId;
        user.email = `${steamId}@steam.com`; // steam does not disclose emails, prevent duplicate keys
        user.tokens.push({ kind: 'steam', accessToken: steamId });
        user.profile.name = profile.personaname;
        user.profile.picture = profile.avatarmedium;
        user.save((err) => {
          done(err, user);
        });
      }).catch((err) => {
        done(err, null);
      });
  }
}));

/**
 * Pinterest API OAuth.
 */
passport.use('pinterest', new OAuth2Strategy({
  authorizationURL: 'https://api.pinterest.com/oauth/',
  tokenURL: 'https://api.pinterest.com/v1/oauth/token',
  clientID: process.env.PINTEREST_ID,
  clientSecret: process.env.PINTEREST_SECRET,
  callbackURL: process.env.PINTEREST_REDIRECT_URL,
  passReqToCallback: true
},
  (req, accessToken, refreshToken, profile, done) => {
    User.findById(req.user._id, (err, user) => {
      if (err) { return done(err); }
      user.tokens.push({ kind: 'pinterest', accessToken });
      user.save((err) => {
        done(err, user);
      });
    });
  }));

/**
 * Intuit/QuickBooks API OAuth.
 */
const quickbooksStrategyConfig = new OAuth2Strategy({
  authorizationURL: 'https://appcenter.intuit.com/connect/oauth2',
  tokenURL: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  clientID: process.env.QUICKBOOKS_CLIENT_ID,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/quickbooks/callback`,
  passReqToCallback: true
},
  (res, accessToken, refreshToken, params, profile, done) => {
    User.findById(res.user._id, (err, user) => {
      if (err) { return done(err); }
      user.quickbooks = res.query.realmId;
      if (user.tokens.filter((vendor) => (vendor.kind === 'quickbooks'))[0]) {
        user.tokens.some((tokenObject) => {
          if (tokenObject.kind === 'quickbooks') {
            tokenObject.accessToken = accessToken;
            tokenObject.accessTokenExpires = moment().add(params.expires_in, 'seconds').format();
            tokenObject.refreshToken = refreshToken;
            tokenObject.refreshTokenExpires = moment().add(params.x_refresh_token_expires_in, 'seconds').format();
            if (params.expires_in) tokenObject.accessTokenExpires = moment().add(params.expires_in, 'seconds').format();
            return true;
          }
          return false;
        });
        user.markModified('tokens');
        user.save((err) => { done(err, user); });
      } else {
        user.tokens.push({
          kind: 'quickbooks',
          accessToken,
          accessTokenExpires: moment().add(params.expires_in, 'seconds').format(),
          refreshToken,
          refreshTokenExpires: moment().add(params.x_refresh_token_expires_in, 'seconds').format()
        });
        user.save((err) => { done(err, user); });
      }
    });
  });
passport.use('quickbooks', quickbooksStrategyConfig);
refresh.use('quickbooks', quickbooksStrategyConfig);

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = (req, res, next) => {
  const provider = req.path.split('/')[2];
  const token = req.user.tokens.find((token) => token.kind === provider);
  if (token) {
    // Is there an access token expiration and access token expired?
    // Yes: Is there a refresh token?
    //     Yes: Does it have expiration and if so is it expired?
    //       Yes, Quickbooks - We got nothing, redirect to res.redirect(`/auth/${provider}`);
    //       No, Quickbooks and Google- refresh token and save, and then go to next();
    //    No:  Treat it like we got nothing, redirect to res.redirect(`/auth/${provider}`);
    // No: we are good, go to next():
    if (token.accessTokenExpires && moment(token.accessTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
      if (token.refreshToken) {
        if (token.refreshTokenExpires && moment(token.refreshTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
          res.redirect(`/auth/${provider}`);
        } else {
          refresh.requestNewAccessToken(`${provider}`, token.refreshToken, (err, accessToken, refreshToken, params) => {
            User.findById(req.user.id, (err, user) => {
              user.tokens.some((tokenObject) => {
                if (tokenObject.kind === provider) {
                  tokenObject.accessToken = accessToken;
                  if (params.expires_in) tokenObject.accessTokenExpires = moment().add(params.expires_in, 'seconds').format();
                  return true;
                }
                return false;
              });
              req.user = user;
              user.markModified('tokens');
              user.save((err) => {
                if (err) console.log(err);
                next();
              });
            });
          });
        }
      } else {
        res.redirect(`/auth/${provider}`);
      }
    } else {
      next();
    }
  } else {
    res.redirect(`/auth/${provider}`);
  }
};
