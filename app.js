var fs 		= require('fs');
var _  		= require('underscore');
var http 	= require('http');
var path 	= require('path');

var moment = require('moment');

// Mongoose Config
var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var mongoose_options = { db: { safe: true }}
mongoose.connect(process.env.MONGOHQ_URL, mongoose_options);
// TODO: check mongoose connection. only start server on success

// Prepare Models
var Member = require('./models/member.js');
var School = require('./models/school.js');


var app_url = process.env.APP_URL;
if (process.env.PORT) {
	app_url += ":"+process.env.PORT;
}

// SendGrid
var SendGrid = require('sendgrid').SendGrid;
var sendgrid = new SendGrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

// Passport AUTH
var passport 	= require('passport');
var fb_strategy	= require('passport-facebook').Strategy;

passport.use(new fb_strategy({
		clientID: process.env.FACEBOOK_APP_ID,
		clientSecret: process.env.FACEBOOK_SECRET,
		callbackURL: app_url+"/auth/facebook/callback"
	},
  
	function(accessToken, refreshToken, profile, done) {
		// ddd(profile);
		
		Member.findOne({'facebook.id':profile.id}, function(err, member){
			
			if (member) {
				member.facebook.profile = profile._json;
				member.facebook.token.access = accessToken;
				member.facebook.token.refresh = refreshToken;
				member.save(function(err, member){
					done(null, member);
				});
			} else {
				var member = new Member();
				member.facebook.id = profile.id;
				member.facebook.profile = profile._json;
				member.facebook.token.access = accessToken;
				member.facebook.token.refresh = refreshToken;
				member.email = profile.emails[0].value;
				member.name.first = profile.name.givenName; 
				member.name.last = profile.name.familyName;
				
				member.save(function(err, member){
					if (err) {return done(err)}
					
					// TODO: mailing should be async
					sendgrid.send({
					  to: member.email,
					  from: 'sweetlearning@siter.com.au',
					  subject: 'Your New Account on Sweet Learning',
					  text: 'Hi, '+member.name.display+'. Welcome to Sweet Learning. '+ app_url
					}, function(success, message) {
					  if (!success) {
					    console.log(message);
					  }
					});
					
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


// EXPRESS
var express = require('express'),
	cons	= require('consolidate'),
	swig	= require('swig');
	
var app = express();
// Sessions
var RedisStore = require('connect-redis')(express);
var redis = require('redis-url').connect(process.env.REDISTOGO_URL);


swig.init({
    root: __dirname + '/views',
    allowErrors: true, // allows errors to be thrown and caught by express instead of suppressed
	filters: require('./lib/swigfilters'),
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
		store: new RedisStore({client:redis}),
		key: "_.sid",
		cookie: {maxAge: 4838400000} // 8 weeks
	}));
	
    app.use(passport.initialize());
    app.use(passport.session());
	
	app.use(now);
	app.use(load_member);
	app.use(session_alerts);
	
	app.use(express.csrf());
	app.use(load_csrf_token);

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


// Markdown Setup
var rs = require('robotskirt');
var md_parser = rs.Markdown.std([rs.EXT_TABLES, rs.HTML_USE_XHTML]);	


//// routes

// member profile
app.get('/me/:memberid', function(req, res){
	var memberid = req.params.memberid;
	Member.findById(memberid, function (err, member_profile) {
		if (err) { 
		    res.status(404);
		    res.render('errors/404');
		} else {
			res.render('member/profile', {profile:member_profile});			
		}
	});
});


// member profile
app.get('/me', restricted, function(req, res){
	res.render('member/profile', {profile:req.user});
});

// member settings
app.get('/settings', restricted, function(req, res){
	res.redirect('/settings/info');
});

app.get('/settings/info', restricted, function(req, res){
	res.render('settings/info', {settings:req.user, settings_section: 'info'});
});

app.get('/settings/interface', restricted, function(req, res){
	res.render('settings/interface', {settings:req.user, settings_section: 'interface'});	
});

app.post('/settings/info', restricted, function(req, res){
	var me = req.user;
	var new_data = req.body.settings;

	// TODO: validate data
	
	me.name = new_data.name;
	me.website = new_data.website;
	me.location = new_data.location;
	me.bio = new_data.bio;
	me.email = new_data.email;

	me.save(function(err,member){
		if (err) {
			req.session.alerts.push({type:'error', message:"There was a problem saving your information " + err});
			res.render('settings/info', {settings:new_data, settings_section:'info'});
		} else {
			req.session.alerts.push({type:'success', message:"Your information has been saved. <a href='/me' class='btn'>View Profile</a>"});
			res.redirect('settings/info');
		}
	})

});

app.get('/settings/schools', restricted, function(req, res){
	res.redirect('/schooladmin');
});

app.get('/schooladmin', restricted, function(req, res){	
	School.find({'admins': req.user.id}, function(err, schools){ 
		res.render('settings/schools', {settings_section: 'schools', my_schools: schools});
	});
});

app.get('/schooladmin/:school_webname', restricted, function(req, res){
	res.redirect(req.url+"/details");
});

app.get('/schooladmin/:school_webname/:school_edit_section', restricted, function(req, res){
	if (req.session.schooladmin_badschool) {
		res.locals.school = req.session.schooladmin_badschool;
		delete req.session.schooladmin_badschool;
	}
	
	res.render('schooladmin/'+res.locals.section);
});

app.post('/schooladmin/:school_webname/details', restricted, function(req, res){
	var school = res.locals.school;
	var data = req.body.school;
	
	school.name = data.name;
	school.description_md = data.description_md;
	school.description = md_parser.render(data.description_md);
	school.summary = data.summary.substr(0,140);
	
	school.save(function(err, saved_school){
		if (err) {
			req.session.schooladmin_badschool = school;
			req.session.alerts.push({type:'error', message:"There was a problem saving school information " + err});
			// res.redirect('back');
			// res.render('schooladmin/edit', {school:school});
		} else {
			req.session.alerts.push({type:'success', message:"School information has been saved"});
			// res.render('schooladmin/edit', {school:saved_school});
		}
		res.redirect('back');
	});	
});

app.post('/schooladmin/:school_webname/contact', restricted, function(req, res){
	var school = res.locals.school;
	var data = req.body.school;
	
	school.www = data.www.replace(/^.+:\/\//,'');		
	school.phone = data.phone;
	school.email = data.email;
	school.location = data.location;
	
	school.save(function(err, saved_school){
		if (err) {
			req.session.schooladmin_badschool = school;
			req.session.alerts.push({type:'error', message:"There was a problem saving school information " + err});
			// res.redirect('back');
			// res.render('schooladmin/edit', {school:school});
		} else {
			req.session.alerts.push({type:'success', message:"School information has been saved"});
			// res.render('schooladmin/edit', {school:saved_school});
		}
		res.redirect('back');
	});	
});


// add 
app.get('/schooladmin/add', restricted, function(req, res){
	res.render('schooladmin/add');
});

app.post('/schooladmin/add', restricted, function(req, res){
	
	var data = req.body.school;
	
	var school = new School();

	school.name = data.name;
	school.summary = data.summary.substr(0,140);
	school.www = data.www.replace(/^.+:\/\//,'');		
	school.phone = data.phone;

	school.webname = school.id;
	
	var me = req.user;
	school._creator = me;
	school.admins.push(me);
	// TODO: validate data
	
	// save school
	school.save(function (err, school) {
        if(err) {
			req.session.alerts.push({type:'error', message:"Problem adding new school. " + err});
			res.render('schooladmin/add', {"school":school});	
		} else {
			res.redirect(school.settings_urlpath)
		}
	});

});


// public
app.get('/', restricted_home, function(req, res){
	School
	.find()
	// .limit(4)
	.exec(function(err,schools){
		res.render('memberhome', {schools:schools});
	});
});


//// schools
app.get('/explore', function(req, res){
	School
	.find()
	.exec(function(err,schools){
		res.render('school/list', {schools:schools});
	});
});


app.get('/info', function(req, res){
	res.redirect('/info/info');
});

app.get('/info/:infopage', function(req, res, next){
	try {
		var infopage = req.params.infopage;
	    stats = fs.lstatSync('views/infopages/'+infopage+'.html');

		res.render('infopages/'+infopage);
		
	}
	catch (e) {
		next();
	}
	
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

app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));

app.get(
	'/auth/facebook/callback', 
	passport.authenticate(
		'facebook', 
		{ 
			successRedirect: '/', 
			failureRedirect: '/auth/login' 
		}
	)

);




// single school
app.get('/:school_webname', function(req, res){
	res.render('school/show');		
});


//// functions

//// params
app.param('school_webname', function(req, res, next, webname){
	
	// load school
	School.findOne({'webname': webname}, function(err, school){
		if (school) {
			res.locals.school = school;
		
			// ddd(school);
		
			if (req.user) {
				res.locals.isadmin = _.contains(_.map(school.admins, function(a) {return a+''}), req.user.id);
			}
			next();

		} else {
			next('route');
		}		
	});
});

app.param('school_edit_section', function(req, res, next, section){
	if (!section) {
		section = "details";
	}

	var schooladmin_sections = {
		details: "Basic Details",
		contact: "Contact Info"
	};
	
	if (schooladmin_sections[section]) {
		res.locals.section = section; 
		res.locals.sections = schooladmin_sections;
		next();
	} else {
		next('route');
	}
	
});


// middleware

function restricted(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		// TODO: Capture location for redirect after login
		
		req.session.alerts.push({type:'error', message: 'Access denied!'});
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

function load_csrf_token(req,res,next){
	res.locals.csrf_token = req.session._csrf;
	next();
}

function now(req,res,next){
	res.locals.now = moment();
	next();
}


function ddd(obj) {
	console.log(obj);
}

////

http.createServer(app).listen(app.get('port'), function(){
  console.log("Sweet Learning: port " + app.get('port'));
});
