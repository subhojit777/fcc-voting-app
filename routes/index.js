var express = require('express');
var router = express.Router();
var passport = require('passport');
var os = require('os');
var ObjectId = require('mongodb').ObjectID;
var helper = require('../helpers/helper');

// Home page.
router.get('/', function(req, res, next) {
  // Show all existing polls.
  req.app.locals.pollsCollection.find().toArray(function(err, docs) {
    if (err) return next(err);

    res.render('index', {
      'title': 'Polls',
      'loggedIn': req.user ? true : false,
      'polls': docs
    });
  });
});

// Poll information.
router.route('/poll/:id')
.get(function(req, res, next) {
  req.app.locals.pollsCollection.findOne(new ObjectId(req.params.id), function(err, doc) {
    if (err) return next(err);

    req.session.poll = doc;

    res.render('poll', {
      'title': doc.title,
      'poll': doc,
      'loggedIn': req.user ? true : false,
      'alert': false
    });
  });
})
.post(function(req, res, next) {
  // Validate whether any selection was made.
  if (req.body.selection) {
    if (req.user) {
      req.app.locals.votesCollection.find({
        isAuthenticatedVoter: true,
        voter: req.user,
        poll: new ObjectId(req.body['poll-id'])
      }).toArray(function(err, docs) {
        if (err) return next(err);

        var hasVoted = docs.length ? true : false;

        if (hasVoted) {
          res.render('poll', {
            'title': req.session.poll.title,
            'poll': req.session.poll,
            'loggedIn': true,
            'alert': true,
            'status': 'danger',
            'message': 'You have already voted'
          });
        }
        else {
          helper.saveVote({
            isAuthenticated: true,
            pollId: req.body['poll-id'],
            voter: req.user
          }, function(err) {
            if (err) return next(err);

            res.render('poll', {
              'title': req.session.poll.title,
              'poll': req.session.poll,
              'loggedIn': true,
              'alert': true,
              'status': 'success',
              'message': 'Vote saved successfully'
            });
          });
        }
      });
    }
    else {
      req.app.locals.votesCollection.find({
        isAuthenticatedVoter: false,
        voter: req.ipAddress,
        poll: new ObjectId(req.body['poll-id'])
      }).toArray(function(err, docs) {
        if (err) return next(err);

        var hasVoted = docs.length ? true : false;

        if (hasVoted) {
          res.render('poll', {
            'title': req.session.poll.title,
            'poll': req.session.poll,
            'loggedIn': false,
            'alert': true,
            'status': 'danger',
            'message': 'You have already voted'
          });
        }
        else {
          helper.saveVote({
            isAuthenticated: false,
            pollId: req.body['poll-id'],
            ipAddress: req.ipAddress
          }, function(err) {
            if (err) return next(err);

            res.render('poll', {
              'title': req.session.poll.title,
              'poll': req.session.poll,
              'loggedIn': false,
              'alert': true,
              'status': 'success',
              'message': 'Vote saved successfully'
            });
          });
        }
      });
    }
  }
  else {
    // User has not selected any option.
    res.render('poll', {
      'title': req.session.poll.title,
      'poll': req.session.poll,
      'loggedIn': req.user ? true : false,
      'alert': true,
      'status': 'danger',
      'message': 'No option selected'
    });
  }
});

// Twitter callbacks.
router.get('/auth/twitter', passport.authenticate('twitter'));

router.get('/auth/twitter/callback', function(req, res, next) {
  passport.authenticate('twitter', function(err, user, info) {
    if (err) return next(err);

    req.logIn(user, function(err) {
      if (err) return next(err);

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
    req.app.locals.pollsCollection.insertOne({
      title: req.body.title,
      options: req.body.options.split(os.EOL).map(function(c) { return c.trim(); }),
      user: req.user
    }, function(err, r) {
      if (err) return next(err);

      res.render('newpoll', {
        'title': 'New Poll',
        'loggedIn': true,
        'alert': true,
        'status': 'success',
        'message': 'Poll created successfully'
      });
    });
  }
});

module.exports = router;
