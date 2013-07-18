var Member = require('../models/member.js');

var SendGrid = require('sendgrid').SendGrid;
var sendgrid = new SendGrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

var passport = require('passport');
var fb_strategy	= require('passport-facebook').Strategy;

var app_url = process.env.APP_URL;
if (process.env.PORT) {
	app_url += ":"+process.env.PORT;
}

module.exports = function(){

  passport.use(
  	new fb_strategy({
  		clientID: process.env.FACEBOOK_APP_ID,
  		clientSecret: process.env.FACEBOOK_SECRET,
  		callbackURL: app_url + "/auth/facebook/callback"
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
  					globals.sendgrid.send({
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

  return passport;

}

