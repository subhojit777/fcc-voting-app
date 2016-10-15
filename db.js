var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var state = {
  db: null
};

module.exports = {
  connect: function(uri, callback) {
    if (state.db) {
      return callback();
    }

    MongoClient.connect(uri, function(err, db) {
      assert.equal(err, null);
      state.db = db;

      callback();
    });
  },
  getDb: function() {
    return state.db;
  },
  getUsersCollection: function() {
    return state.db.collection('users');
  },
  getPollsCollection: function() {
    return state.db.collection('polls');
  },
  close: function() {
    state.db.close();
  }
};
