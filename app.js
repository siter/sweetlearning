
/**
 * Module dependencies.
 */

var express 	= require('express')
  , http 		= require('http')
  , path 		= require('path')
  ,	cons 		= require('consolidate')
  , swig 		= require('swig')  
  , passport 	= require('passport')
  , fb_strategy	= require('passport-facebook').Strategy;
  
 
var RedisStore = require('connect-redis')(express);

 
var mongoose	= require('mongoose');

var mongoose_options = { db: { safe: true }}
mongoose.connect(process.env.MONGODB_URI, mongoose_options);
// TODO: check mongoose connection. only start server on success


// Mongoose Models
var Member = require('./models/member.js');
var School = require('./models/school.js');

var users = {};

var app_url = process.env.APP_URL;
if (process.env.PORT) {
	app_url += ":"+process.env.PORT;
}

passport.use(new fb_strategy({
		clientID: process.env.FACEBOOK_APP_ID,
		clientSecret: process.env.FACEBOOK_SECRET,
		callbackURL: app_url+"/auth/facebook/callback"
	},
  
	function(accessToken, refreshToken, profile, done) {
		// ddd(profile);
		
		Member.findOne({'facebook.id':profile.id}, function(err, member){
			
			// member not found
			if (member) {
				member.facebook.profile = profile._json;
				member.save();
				member.save(function(err, member){
					done(null, member);
				});
			} else {
				var member = new Member();
				member.facebook.id = profile.id;
				member.facebook.profile = profile._json;
				member.email = profile.emails[0].value;
				member.name.first = profile.name.givenName; 
				member.name.last = profile.name.familyName;
				
				member.save(function(err, member){
					if (err) {return done(err)}
					done(null, member);
				});
			}
			
		});
	  
	}
));

passport.serializeUser(function(member, done) {
	done(null, member.id);
});

passport.deserializeUser(function(id, done) {
	Member.findById(id, function (err, member) {
		if (err) { done(null, false); }
		done(null, member);
	});
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
	app.use(express.session({
		store: new RedisStore,
		key: "_.sid",
		cookie: {maxAge: 99999999999}
	}));

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


// member area
app.get('/me', restricted, function(req, res){
	res.render('member/self');
});

app.get('/me/edit', restricted, function(req, res){
	res.render('member/self');
});


// public
app.get('/', restricted_home, function(req, res){
	res.render('memberhome');
});


//// AUTH
app.get('/auth/login', public_only, function(req, res){
	res.render('auth/login');
});

app.get('/auth/logout', function(req, res){
	req.logOut();
  	req.session.destroy(function(){
    	res.redirect('/');
  	});
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: '/',
                                      failureRedirect: '/auth/login' }));


//// schools
app.get('/schools', function(req, res){
	res.render('school/list', {schools:schools});
});

app.get('/schools/coogee', function(req, res){
	res.render('school/list', {schools:schools});
});

app.get('/schools/coogee/music', function(req, res){
	var data = {
		"schools": schools,
		"location": "Coogee",
		"field": "Music"
	}
	res.render('school/list', data);
});

// add 
app.get('/schools//add', restricted, function(req, res){
	res.render('school/add');
});

app.post('/schools//add', restricted, function(req, res){
	
	var school = new School(req.body.school);
	school.webname = school.id;
	
	// TODO: validate data
	
	// save school
	school.save(function (err, school) {
        if(err) {
			// save error message for presenting on screen
			
			res.render('school/add', {"school":school});	
		} else {
			res.redirect('school//edit/'+school.id)
		}
		// school.save() // success
	});

});


// single school
app.get('/:school_webname', function(req, res){
	res.render('school/show');
});


// infopages
// public home page
app.get('/info/welcome', function(req, res){
	res.render('infopages/welcome');	
});

app.get('/info', function(req, res){
	res.render('infopages/info');
});

app.get('/info/about', function(req,res){
	res.render('infopages/about');
});

app.get('/info/contact', function(req,res){
	res.render('infopages/contact');
});

app.get('/info/privacy', function(req,res){
	res.render('infopages/privacy');
});



// search

app.get('/search', function(req, res){
	res.locals.q = req.query["q"];
	res.render('search');	
});






//// functions

//// params
app.param('school_webname', function(req, res, next, webname){
	
	// load school
	School.findOne({'webname': webname}, function(err, school){
		if (err) {
			return next(new Error('school unknown'));
		}
		
		res.locals.school = school;
		next();
	});
});



// middleware

function restricted(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		// TODO: Capture location for redirect after login
		
		req.session.error = 'Access denied!';
		res.redirect('/auth/login');
	}
}

function restricted_home(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/info/welcome');
  }
}

function public_only(req, res, next) {
  if (req.isAuthenticated()) {
      res.redirect('/');
  } else {
      next();
  }
}

// dummy development function to allow for bypassing logins for template work
function UNrestricted(req, res, next) {
	next();
}

function load_member(req, res, next){
	if (req.user) {
		res.locals.member = req.user;	
	}
  	next();
}

//// TEMP DATA

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
  console.log("Sweet Learning listening on " + app_url);
});
