var express = require('express');
var cons  = require('consolidate');
var swig  = require('swig');
var moment = require('moment');
var path  = require('path');

var RedisStore = require('connect-redis')(express);
var redis = require('redis-url').connect(process.env.REDISTOGO_URL);


module.exports = function(app){

  app.set('port', process.env.PORT || 3000);

  app.set('views', app.get('root') + '/views');
  app.set('public', path.join(app.get('root'), 'public'))

  app.use(express.favicon(app.get('root') + '/public/assets/img/l_400.png'));

  var options = {
    root: app.get('views'),//__dirname + '/views',
    allowErrors: true, // allows errors to be thrown and caught by express instead of suppressed
    filters: require('../lib/swigfilters')
  }

  if ('development' == app.get('env')) {
    options['cache'] = false;
  }

  swig.init(options);

  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(express.static(app.get('public')));
  app.engine('html', cons.swig);
  app.set('view engine', 'html');

  if ('development' == app.get('env')) {
    app.use(express.errorHandler());
    app.use(express.logger('dev'));
  }

  app.use(express.cookieParser(process.env.SECRET));
  app.use(express.session({
    store: new RedisStore({client:redis}),
    key: "_.sid",
    cookie: {maxAge: 4838400000} // 8 weeks
  }));

  app.use(session_alerts);

  app.use(express.csrf());

  app.use(function(req,res,next){
    res.locals.csrf_token = req.session._csrf;
    res.locals.now = moment();
    res.locals.baseurl = process.env.APP_URL;

    next();
  });

  require('./auth')(app);
  app.use(app.router);

  // 404 catch-all
  app.use(function(req,res){
      res.status(404);
      res.render('errors/404');
  });

};

function session_alerts(req, res, next){
  req.session.alerts = req.session.alerts || [];

  var _r = res.render;
  res.render = function() {
    res.locals.alerts = req.session.alerts;
    req.session.alerts = [];
    _r.apply(this, arguments);
  }
  next();
}
