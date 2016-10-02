var express = require('express');
var router = express.Router();
var passport = require('passport');

/* GET home page. */
router.get('/', function(req, res, next) {
  var test = req.isAuthenticated();
  res.render('index', {
    'title': 'Home',
    'siteName': 'Voting App',
    'loggedIn': req.user ? true : false
  });
});

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

router.get('/logout', function(req, res, next){
  req.logout();
  res.redirect('/');
});

module.exports = router;
