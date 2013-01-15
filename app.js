
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
  
var mongoose	= require('mongoose'),
	Schema 		= mongoose.Schema,
	ObjectId 	= Schema.ObjectId;

var mongoose_options = { db: { safe: true }}
mongoose.connect('mongodb://localhost/sl_test', mongoose_options);

var db =  mongoose.connection;

//
// Mongoose SCHEMAS
//
var User = mongoose.Schema({
	
});

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
	app.use(express.static(path.join(__dirname, 'public')));

	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser(process.env.SECRET));
	app.use(express.session());

    app.use(passport.initialize());
    app.use(passport.session());

	app.use(load_member);

	app.use(app.router);


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
app.get('/me', restricted, load_member_schools, function(req, res){
	res.render('me');
});

app.get('/me/edit', restricted, function(req, res){
	res.render('me');
});


// public
app.get('/', function(req, res){
	if (req.user) {
		res.redirect('/me'); return;
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

app.get('/register', function(req, res){

	
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

app.get('/info', function(req, res){
	res.render('info');
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
//		ddd(req.user);
		res.locals.user = req.user;	
	}
  	next();
}

function load_member_schools(req, res, next){
	res.locals.schools = [];
	for (var i = member_schools[req.user.uid].length - 1; i >= 0; i--){
		var sid = member_schools[req.user.uid][i];
		res.locals.schools.push({webname:sid,"name":schools[sid].name})
	};
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

var member_schools = {
	'fb_536852454': ['123singwithme', 'sydney_jazz']
}

var schools = {
	"123singwithme": {
		"id":6, 
		"webname": "123singwithme",
		"name":"1-2-3 Sing With Me",
		"catchphrase":"Music classes for children 6 mo - 5 years",
		"summary":"1-2-3 Sing With Me offers fun and interactive music classes for children 6 months - 5 years.",
		"description":"Join us for singing & nursery rhymes, puppets & games, where children have fun & learn numbers too! As well as being lots of fun, our hour long classes are great for:<ul><li>Early numeracy skills</li><li>Boosting language skills</li><li>Developing confidence</li><li>Gross & fine motor skills</li></ul>",
		"contact": {
			"www":"www.123singwithme.com.au",
			"phone":"(02) 9908 1234",
			"email":"info@123singwithme.com.au"
		},
		"text_sections": [
			{
				"title":"Enrollments",
				"text":"Our term4 enrolments are now underway. If you'd like to join us for term4 then please call us on 9908 1234 now for further details and to request your enrolment pack. Alternatively send an email to info@123singwithme.com.au"
			}
		]
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
