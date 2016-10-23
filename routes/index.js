var express = require('express');
var router = express.Router();
var passport = require('passport');
var os = require('os');
var ObjectId = require('mongodb').ObjectID;

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
  // Obtain IP address of the voter.
  function getIpAddress() {
    var ipAddr = req.headers["x-forwarded-for"];

    if (ipAddr) {
      var list = ipAddr.split(",");
      ipAddr = list[list.length-1];
    }
    else {
      ipAddr = req.connection.remoteAddress;
    }

    return ipAddr;
  }

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
        saveVote(hasVoted, true);
      });
    }
    else {
      var ipAddress = getIpAddress();

      req.app.locals.votesCollection.find({
        isAuthenticatedVoter: false,
        voter: ipAddress,
        poll: new ObjectId(req.body['poll-id'])
      }).toArray(function(err, docs) {
        if (err) return next(err);

        var hasVoted = docs.length ? true : false;
        saveVote(hasVoted, false, ipAddress);
      });
    }

    function saveVote(hasVoted, isAuthenticated, ipAddress) {
      // If user is not authenticated, we save the vote based on IP address.
      // Otherwise, we save the vote based on the user.
      if (!hasVoted) {
        if (isAuthenticated) {
          req.app.locals.votesCollection.insertOne({
            voter: req.user,
            isAuthenticatedVoter: true,
            poll: new ObjectId(req.body['poll-id'])
          }, function(err, r) {
            if (err) return next(err);

            res.render('poll', {
              'title': req.session.poll.title,
              'poll': req.session.poll,
              'loggedIn': isAuthenticated,
              'alert': true,
              'status': 'success',
              'message': 'Vote saved successfully'
            });
          });
        }
        else {
          if (ipAddress === undefined) {
            res.status(500).send('For anonymous voting IP address is required');
            next();
          }

          req.app.locals.votesCollection.insertOne({
            voter: ipAddress,
            isAuthenticatedVoter: false,
            poll: new ObjectId(req.body['poll-id'])
          }, function(err, r) {
            if (err) return next(err);

            res.render('poll', {
              'title': req.session.poll.title,
              'poll': req.session.poll,
              'loggedIn': isAuthenticated,
              'alert': true,
              'status': 'success',
              'message': 'Vote saved successfully'
            });
          });
        }
      }
      else {
        // User has already voted.
        res.render('poll', {
          'title': req.session.poll.title,
          'poll': req.session.poll,
          'loggedIn': isAuthenticated,
          'alert': 'true',
          'status': 'danger',
          'message': 'You have already voted'
        });
      }
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
