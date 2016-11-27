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

    req.app.locals.votesCollection.group(['vote'], {poll: new ObjectId(req.params.id)}, {'count': 0}, "function (obj, prev) { prev.count++; }", function(err, results) {
      if (err) return next(err);

      req.session.poll = doc;
      req.session.pollResults = results;

      res.render('poll', {
        'title': doc.title,
        'poll': doc,
        'loggedIn': req.user ? true : false,
        'alert': false,
        'votes': results,
      });
    });
  });
})
.post(function(req, res, next) {
  // Validate whether any selection was made.
  if (req.body.selection) {
    req.app.locals.votesCollection.find({
      isAuthenticatedVoter: req.user ? true : false,
      voter: req.user ? req.user : req.ipAddress,
      poll: new ObjectId(req.body['poll-id'])
    }).toArray(function(err, docs) {
      if (err) return next(err);

      // Prevent voting duplicacy.
      if (docs.length) {
        res.render('poll', {
          'title': req.session.poll.title,
          'poll': req.session.poll,
          'loggedIn': req.user ? true : false,
          'alert': true,
          'status': 'danger',
          'message': 'You have already voted',
          'votes': req.session.pollResults,
        });
      }
      else {
        // Prepare params for `saveVote()`.
        var params = {
          isAuthenticated: req.user ? true : false,
          pollId: req.body['poll-id'],
          vote: req.body['selection']
        };

        if (req.user) {
          params.voter = req.user;
        }
        else {
          params.ipAddress = req.ipAddress;
        }

        helper.saveVote(params, function(err) {
          if (err) return next(err);

          res.render('poll', {
            'title': req.session.poll.title,
            'poll': req.session.poll,
            'loggedIn': req.user ? true : false,
            'alert': true,
            'status': 'success',
            'message': 'Vote saved successfully',
            'votes': req.session.pollResults,
          });
        });
      }
    });
  }
  else {
    // User has not selected any option.
    res.render('poll', {
      'title': req.session.poll.title,
      'poll': req.session.poll,
      'loggedIn': req.user ? true : false,
      'alert': true,
      'status': 'danger',
      'message': 'No option selected',
      'votes': req.session.pollResults,
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

// New Poll.
router.route('/newpoll')
.get(function(req, res, next) {
  var params = {
    title: 'New Poll',
    loggedIn: req.user ? true : false,
  };

  if (req.user) {
    params.alert = false;
  }
  else {
    params.alert = true;
    params.status = 'danger';
    params.message = 'You need to login before making a new poll'
  }

  res.render('newpoll', params);
})
.post(function(req, res, next) {
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

// My Polls.
router.route('/mypolls')
.get(function(req, res, next) {
  var params = {
    title: 'My Polls',
    loggedIn: req.user ? true : false,
  };

  if (req.user) {
    params.alert = false;

    // Fetch all polls of the current user.
    req.app.locals.pollsCollection.find({'user': new ObjectId(req.user)}).toArray(function(err, docs) {
      if (err) return next(err);

      params.polls = docs;
      res.render('mypolls', params);
    });
  }
  else {
    params.alert = true;
    params.status = 'danger';
    params.message = 'You need to login'

    res.render('mypolls', params);
  }
});

module.exports = router;
