
/**
 * Module dependencies.
 */

var express 	= require('express')
  , routes 		= require('./routes')
  , http 		= require('http')
  , path 		= require('path')
  ,	cons 		= require('consolidate')
  , swig 		= require('swig')
  
  , passport 	= require('passport')
  , fb_strategy	= require('passport-facebook').Strategy;


var users = {};

passport.use(new fb_strategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://d.sweetlearning.com.au:3000/auth/facebook/callback"
  },
  
  function(accessToken, refreshToken, profile, done) {	  
	  var userprofile = {};
	  
	  if (users['fb_'+profile.id]) {
		  
		  userprofile = users['fb_'+profile.id];
		  
	  } else {
		  var now = new Date();
		  
		  userprofile = profile;

		  userprofile['fb_access_token'] = accessToken;
		  userprofile['fb_refresh_token'] = refreshToken;
		  userprofile['created'] = now.toJSON;
		  userprofile['uid'] = 'fb_'+profile.id;
		  
		  users['fb_'+profile.id] = userprofile;
	  }
	  	  
	  return done(null, userprofile);
  }
));

passport.serializeUser(function(user, done) {
	done(null, user.uid);
});

passport.deserializeUser(function(id, done) {
	var userprofile = users[id];
	if (userprofile) {
		done(null, userprofile);
	} else {
		done(null, false);
	}
});



var app = express();

swig.init({
    root: __dirname + '/views',
    allowErrors: true, // allows errors to be thrown and caught by express instead of suppressed
	cache: false //TODO: disable for production
});

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.engine('.html', cons.swig);
	app.set('view engine', 'html');
	app.use(express.favicon(__dirname + '/public/assets/img/favicon.ico'));

	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser(process.env.SECRET));
	app.use(express.session());

    app.use(passport.initialize());
    app.use(passport.session());

	app.use(load_member);

	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));


	// 404 catch-all
	app.use(function(req,res){
	    res.status(404);
	    res.render('errors/404');
	});
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//// routes
app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: '/',
                                      failureRedirect: '/login' }));



// require auth
app.get('/me', restricted, function(req, res){
	res.locals.schools = [{'name':"piano school"},{'name':"guitar school"}];
	res.render('me');
});



// public
app.get('/', function(req, res){
	ddd(req.session);
	if (req.user) {
		ddd(req.user);
		res.render('memberhome');
	} else {
		res.render('home');			
	}
});

app.get('/about', function(req,res){
	res.render('about');
});

app.get('/contact', function(req,res){
	res.render('contact');
});

app.get('/privacy', function(req,res){
	res.render('privacy');
});

app.get('/search', function(req, res){
	res.locals.q = req.query["q"];
	res.render('search');	
});

app.get('/member/:memberid', routes.member);

// dummy login function
app.get('/login', function(req, res){
	res.render('login');
});

app.post('/login', function(req, res){
	var member = members._123;
	
    req.session.regenerate(function(){
      	req.session.member = member;
		res.locals.member = req.session.member;		
		res.render('login');
    });
});

app.get('/logout', function(req, res){
	req.logOut();
  	req.session.destroy(function(){
    	res.redirect('/');
  	});
});

app.get('/schools/:school_webname', function(req, res){
	res.render('one_school');
});

app.get('/schools', function(req, res){
	res.render('schools', {schools:schools});
});



//// functions

// middleware

function restricted(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

function load_member(req, res, next){
	if (req.user) {
		res.locals.user = req.user;		
	}
  	next();
}


//// params

app.param('memberid', function(req, res, next, id){
	if (id == 123) {
	    req.member = members._123;		
	    next();
	} else {
      	next(new Error('member unknown'));		
	}
});

app.param('school_webname', function(req, res, next, webname){
	if (schools[webname]) {
		res.locals.school = schools[webname];
	    next();
	} else {
      	next(new Error('school unknown'));		
	}
});

////

var members = {
	_123: {"id":123, "name":"Graham Green"}
};

var schools = {
	"123singwithme": {
		"id":6, 
		"webname": "123singwithme",
		"name":"1-2-3 Sing With Me",
		"catchphrase":"Music classes for children 6 mo - 5 years",
		"summary":"1-2-3 Sing With Me offers fun and interactive music classes for children 6 months - 5 years.",
		"description":"Join us for singing & nursery rhymes, puppets & games, where children have fun & learn numbers too! As well as being lots of fun, our hour long classes are great for:<ul><li>Early numeracy skills</li><li>Boosting language skills</li><li>Developing confidence</li><li>Gross & fine motor skills</li></ul>",
		"www":"www.123singwithme.com.au",
		"phone":"(02) 9908 1234",
		"colour":"E01B6A"
	} 
	,
	"first_guitar": {
		"id":1, 
		"webname": "first_guitar",
		"name":"First Guitar School",
		"catchphrase":"Riffing it since 1978",
	}
	,
	"piano_man": {
		"id":2, 
		"webname": "piano_man",
		"name":"The Piano Man",
		"catchphrase":"Jazzing classics for all ages",
	}
	,
	"sydney_jazz": {
		"id":3, 
		"webname": "sydney_jazz",
		"name":"Sydney Jazz",
		"catchphrase":"Oldest sydney jazz guitar school",
	}
	,
	"singarama": {
		"id":4, 
		"webname": "singarama",
		"name":"Singarama",
		"catchphrase":"Singing lessons for tv professionals",
	}
	,
	"bondipiano": {
		"id":5, 
		"webname": "bondipiano",
		"name":"Bondi Piano School",
		"catchphrase":"Classical piano tuition for children 6+",
	}
}


function ddd(obj) {
	console.log(obj);
}

////

http.createServer(app).listen(app.get('port'), function(){
  console.log("Sweet Learning listening on port " + app.get('port'));
});
