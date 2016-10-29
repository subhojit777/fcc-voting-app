'use strict';

var mongodb = require('../db');
var ObjectId = require('mongodb').ObjectID;

// @TODO we can write a test for this.
exports.saveVote = function(params, callback) {
  var votesCollection = mongodb.getVotesCollection();

  // If user is not authenticated, we save the vote based on IP address.
  // Otherwise, we save the vote based on the user.
  if (params.isAuthenticated) {
    if (params.voter === undefined) {
      callback(new Error('For anonymous voting voter object is required'));
    }

    votesCollection.insertOne({
      voter: params.voter,
      isAuthenticatedVoter: true,
      poll: new ObjectId(params.pollId)
    }, function(err, r) {
      if (err) callback(err);

      callback();
    });
  }
  else {
    if (params.ipAddress === undefined) {
      callback(new Error('For anonymous voting IP address is required'));
    }

    votesCollection.insertOne({
      voter: params.ipAddress,
      isAuthenticatedVoter: false,
      poll: new ObjectId(params.pollId)
    }, function(err, r) {
      if (err) callback(err);

      callback();
    });
  }
}
