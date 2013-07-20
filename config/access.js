exports.public_only = function(req, res, next) {
  if (req.isAuthenticated()) {
      res.redirect('/');
  } else {
      next();
  }
}

exports.restricted = function (req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    // TODO: Capture location for redirect after login

    req.session.alerts.push({type:'error', message: 'You don\'t have enough permissions. Please log in!'});
    res.redirect('/auth/login');
  }
}

exports.restricted_home = function (req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/info/welcome');
  }
}

// dummy development function to allow for bypassing logins for template work
exports.UNrestricted = function(req, res, next) {
  next();
}

