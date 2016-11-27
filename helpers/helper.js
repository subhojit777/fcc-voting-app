'use strict';

var mongodb = require('../db');
var ObjectId = require('mongodb').ObjectID;

// @TODO we can write a test for this.
exports.saveVote = function(params, callback) {
  // If user is not authenticated, we save the vote based on IP address.
  // Otherwise, we save the vote based on the user.
  if (params.isAuthenticated) {
    if (params.voter === undefined) {
      callback(new Error('For authenticated voting, voter object is required'));
    }
  }
  else {
    if (params.ipAddress === undefined) {
      callback(new Error('For anonymous voting, IP address is required'));
    }
  }

  mongodb.getVotesCollection().insertOne({
    voter: params.isAuthenticated ? params.voter : params.ipAddress,
    isAuthenticatedVoter: params.isAuthenticated,
    poll: new ObjectId(params.pollId),
    vote: params.vote
  }, function(err, r) {
    if (err) callback(err);

    callback();
  });
}
