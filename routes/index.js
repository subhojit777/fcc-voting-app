var express = require('express');
var router = express.Router();
var passport = require('passport');
var os = require('os');

// Home page.
router.get('/', function(req, res, next) {
  res.render('index', {
    'title': 'Home',
    'loggedIn': req.user ? true : false
  });
});

// Twitter callbacks.
router.get('/auth/twitter', passport.authenticate('twitter'));

router.get('/auth/twitter/callback', function(req, res, next) {
  passport.authenticate('twitter', function(err, user, info) {
    if (err) {
      return next(err);
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
});

// Logout callback.
router.get('/logout', function(req, res, next){
  req.logout();
  res.redirect('/');
});

// New Poll page.
router.get('/newpoll', function(req, res, next) {
  if (req.user) {
    res.render('newpoll', {
      'title': 'New Poll',
      'loggedIn': true,
      'alert': false,
    });
  }
  else {
    res.render('newpoll', {
      'title': 'New Poll',
      'loggedIn': false,
      'alert': true,
      'status': 'danger',
      'message': 'You need to login before making a new poll'
    });
  }
});

// Creates new poll.
router.post('/newpoll', function(req, res, next) {
  if (req.body.options.split(os.EOL).length < 2) {
    res.render('newpoll', {
      'title': 'New Poll',
      'loggedIn': true,
      'alert': true,
      'status': 'warning',
      'message': 'You should enter at least two options'
    });
  }
  else {
    // Everything is alright, save poll to database.
    req.app.locals.usersCollection.findOne({
      uid: req.user
    }, function(err, result) {
      req.app.locals.pollsCollection.insertOne({
        title: req.body.title,
        options: req.body.options.split(os.EOL),
        created: new Date(),
        user: result._id
      }, function(err, r) {
        res.render('newpoll', {
          'title': 'New Poll',
          'loggedIn': true,
          'alert': true,
          'status': 'success',
          'message': 'Poll created successfully'
        });
      });
    });
  }
});

module.exports = router;
