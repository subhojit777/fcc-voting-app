var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var session = require('express-session');
var assert = require('assert');
var mongodb = require('./db');
require('dotenv').config();

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use(express.static(path.join(__dirname, 'node_modules/jquery/dist')));

// Session will expire after 1 week.
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    maxAge: 604800000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Prepare MongoDB connection.
mongodb.connect(process.env.MONGO_URI, function() {
  process.nextTick(function() {
    app.locals.db = mongodb.getDb();
    var usersCollection = app.locals.users = mongodb.getUsersCollection();

    passport.use(new TwitterStrategy({
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: process.env.CALLBACK_URL
      },
      function(token, tokenSecret, profile, done) {
        process.nextTick(function() {
          usersCollection.findOne({
            'uid': profile.id
          },
          function(err, user) {
            if (user) {
              done(null, user);
            }
            else {
              usersCollection.insertOne({
                'uid': profile.id,
                'username': profile.username,
                'displayName': profile.displayName
              },
              function(err, user) {
                assert.equal(null, err);
                assert.equal(1, user.insertedCount);
                done(null, user);
              });
            }
          });
        });
      }
    ));

    // Create the session.
    passport.serializeUser(function(user, done) {
      done(null, user.uid);
    });

    passport.deserializeUser(function(id, done) {
      usersCollection.findOne({
        'uid': id
      },
      function(err, user) {
        done(null, user.uid);
      });
    });
  });
});

module.exports = app;
