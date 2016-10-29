'use strict';

exports.ipAddress = function(req, res, next) {
  var ipAddr = req.headers["x-forwarded-for"];

  if (ipAddr) {
    var list = ipAddr.split(",");
    ipAddr = list[list.length-1];
  }
  else {
    ipAddr = req.connection.remoteAddress;
  }

  req.ipAddress = ipAddr;

  next();
}
