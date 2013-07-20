var Q = require('q');

var Member = require('../models/member.js');
var School = require('../models/school.js');

var sections = exports.sections = {
  info: 'Personal Details',
  schools: 'School Manager'
}

exports.preload = function(req, res, next) {
  res.locals.settings = req.user;
  res.locals.sections = sections;
  next();
}


exports.private_profile = function(req, res){

  get_member_admin_schools(req.user.id)
    .then(function(schools) {
      res.locals.profile = req.user;
      res.locals.schools = schools;
      res.render('member/profile')

    })
    .done();
};

function get_member_admin_schools(id){
  var d = Q.defer();
  School.find({'admins': id}, function(err, schools){
    d.resolve(schools);
  })
  return d.promise;
}


exports.public_profile = function(req, res){
  var memberid = req.params.memberid;
  Member.findById(memberid, function (err, member_profile) {
    if (err) {
        res.status(404);
        res.render('errors/404');
    } else {
      res.render('member/profile', {profile:member_profile});
    }
  });
};


exports.settings_schools = function(req, res){
  res.locals.section = "schools";

  School.find({'admins': req.user.id}, function(err, schools){
    var data = {
      schools: schools
    }
    res.render('settings/schools', data);
  });
}


// settings
exports.settings_info = function(req, res){

  res.locals.section = "info";

  if ("POST" == req.method) {
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
        res.render('settings/info', {settings:new_data});
      } else {
        req.session.alerts.push({type:'success', message:"Your information has been saved. <a href='/me' class='btn'>View Profile</a>"});
        res.redirect('settings/info');
      }
    })

  } else {
    res.render('settings/info');
  }

};

