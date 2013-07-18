// TODO: Add cluster support

var fs    = require('fs');
var _     = require('underscore');
var http  = require('http');
var path  = require('path');

var moment = require('moment');

// Mongoose Config
var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var mongoose_options = { db: { safe: true }}
mongoose.connect(process.env.MONGOHQ_URL, mongoose_options);
// TODO: check mongoose connection. only start server on success

// Prepare Models
var Member = require('./models/member');
var School = require('./models/school');
var Course = require('./models/course');

// EXPRESS
var express = require('express');
var app = express();

// Sessions

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('public', path.join(__dirname, 'public'))

app.use(express.favicon(__dirname + '/public/assets/img/l_400.png'));

require('./config/express')(app);

var passport = require('./config/passport')();
app.use(passport.initialize());
app.use(passport.session());

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

// development only
// if ('development' == app.get('env')) {
//   app.use(express.errorHandler());
// }


// Markdown Setup
var rs = require('robotskirt');
var md_parser = rs.Markdown.std([rs.EXT_TABLES, rs.HTML_USE_XHTML]);


//// routes

// member profile

// app.get('/me/:memberid', routes.member.public_profile);
// function(req, res){
//  var memberid = req.params.memberid;
//  Member.findById(memberid, function (err, member_profile) {
//    if (err) {
//        res.status(404);
//        res.render('errors/404');
//    } else {
//      res.render('member/profile', {profile:member_profile});
//    }
//  });
// });


// member profile
// app.get('/me', restricted, function(req, res){
//  res.render('member/profile', {profile:req.user});
// });


var routes = {};
routes.member = require('./routes/member.routes');

// member
app.get('/me/:memberid', routes.member.public_profile);
app.get('/me', restricted, routes.member.private_profile);

app.all('/settings*', restricted, routes.member.preload);

app.get('/settings', function(req, res){
  res.redirect('/settings/info');
});
app.all('/settings/info', routes.member.settings_info);

app.get('/settings/schools', routes.member.settings_schools);



app.get('/-/school', restricted, function(req, res){
  School.find({'admins': req.user.id}, function(err, schools){
    res.render('settings/schools', {settings_section: 'schools', my_schools: schools});
  });
});

app.get('/-/school/*', load_school_edit_sections, function(req, res, next){
  next();
});

app.get('/-/school/:school_id', restricted, function(req, res){
  res.redirect(req.url+"/account");
});

app.get('/-/school/:school_id/courses', restricted, function(req, res){
  var school = res.locals.school;
  Course.find({'school': school.id}, function(err, courses){
    res.render('schooladmin/courses', {section: 'courses', courses: courses});
  });
});

// admin screen catch-all
app.get('/-/school/:school_id/:school_edit_section', restricted, function(req, res){
  if (req.session.schooladmin_badschool) {
    res.locals.school = req.session.schooladmin_badschool;
    delete req.session.schooladmin_badschool;
  }

  res.render('schooladmin/'+res.locals.section);
});

app.get('/-/course/:course_id', restricted, function(req, res){
  res.render('schooladmin/course');
});



/// SCHOOL ADMIN
/// POST
app.post('/-/school/:school_id/account', restricted, function(req, res){
  var school = res.locals.school;
  var data = req.body.school;

  school.name = data.name.substr(0,school.name_maxlength);
  school.webname = data.webname.substr(0,school.webname_maxlength).replace(/\s+/g, '-');
  if (school.webname.substr(0,1) == '-') {
    req.session.alerts.push({type:'error', message:"Webname cannot begin with a dash"});
    res.redirect('back');
    return;
  }
  // check webname for uniqueness (may be handled by mongo)

  school.save(function(err, saved_school){
    if (err) {
      req.session.schooladmin_badschool = school;
      req.session.alerts.push({type:'error', message:"There was a problem saving school information " + err});
    } else {
      req.session.alerts.push({type:'success', message:"School information updated"});
    }
    res.redirect('back');
  });
});

app.post('/-/school/:school_id/account/setactive', restricted, function(req, res){
  var school = res.locals.school;
  var status = req.body.status;

  school.status.active = JSON.parse(status);

  school.save(function(err, saved_school){
    if (err) {
      req.session.alerts.push({type:'error', message:"Status update failed"});
    } else {
      req.session.alerts.push({type:'success', message:"School status updated"});
    }
    res.redirect('back');
  });
});

app.post('/-/school/:school_id/account/delete', restricted, function(req, res){
  var school = res.locals.school;

  if (!req.body.agree) {
    req.session.alerts.push({type:'error', message:"We're not sure you understand what you're doing. Click 'I understand'."});
    res.redirect('back');
  } else {
    school.status.active = false;
    school.status.deleted = true;
    school.webname = school.id;

    var me = req.user;
    school._deleter = me;
    school.admins = [];

    school.notes.push("Delete Reason: " + req.body.reason);
    school.notes.push("Delete Time: " + moment().utc().format());

    school.save(function(err, saved_school){
      if (err) {
        req.session.alerts.push({type:'error', message: "Could not delete school"});
        res.redirect('back');
      } else {
        // TODO: send email

        req.session.alerts.push({type:'success', message:"School "+ school.name +" deleted"});
        ddd('delete');
        ddd(school);
        res.redirect('/schooladmin');
      }
    });
  }
});

app.post('/-/school/:school_id/description', restricted, function(req, res){
  var school = res.locals.school;
  var data = req.body.school;

  school.description_md = data.description_md;
  school.description = md_parser.render(data.description_md);
  school.summary = data.summary.substr(0,140);

  school.save(function(err, saved_school){
    if (err) {
      req.session.schooladmin_badschool = school;
      req.session.alerts.push({type:'error', message:"There was a problem saving school information " + err});
    } else {
      req.session.alerts.push({type:'success', message:"School information updated"});
    }
    res.redirect('back');
  });
});

app.post('/-/school/:school_id/contact', restricted, function(req, res){
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
    } else {
      req.session.alerts.push({type:'success', message:"School information updated"});
    }
    res.redirect('back');
  });
});


app.post('/-/school/:school_id/course-quickadd', restricted, function(req, res){
  var school = res.locals.school;

  var data = req.body.course;

  var course = new Course();

  course.name = data.name.substr(0,40);

  course.webname = course.id;

  var me = req.user;
  course._creator = me;
  course.school = school;

  // save school
  course.save(function (err, course) {
        if(err) {
      req.session.alerts.push({type:'error', message:"Problem adding new course. " + err});
      res.redirect('back');
    } else {
      ddd(course);
      res.redirect(course.settings_urlpath)
    }
  });

});



// add
app.get('/-/school/add', restricted, function(req, res){
  res.render('schooladmin/add');
});

app.post('/-/school/add', restricted, function(req, res){

  var data = req.body.school;

  var school = new School();

  school.name = data.name.substr(0,40);
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

app.post('/-/school/quickadd', restricted, function(req, res){

  var data = req.body.school;

  var school = new School();

  school.name = data.name.substr(0,40);

  school.webname = school.id;

  var me = req.user;
  school._creator = me;
  school.admins.push(me);

  // save school
  school.save(function (err, school) {
        if(err) {
      req.session.alerts.push({type:'error', message:"Problem adding new school. " + err});
      res.redirect('back');
    } else {
      res.redirect(school.settings_urlpath)
    }
  });

});




// public
app.get('/', restricted_home, function(req, res){
  School
  .find({'status.active': true})
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
app.get('/:school_webname', function(req, res, next){
  if (!res.locals.school.status.active) {
    if (res.locals.isadmin) {
      req.session.alerts.push({type:'error', message:"This page is HIDDEN. Only you can see it. You are a manager. View Settings to make visible."});
      res.render('school/show');
    } else {
      next('route');
    }
  } else {
    res.render('school/show');
  }

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

app.param('school_id', function(req, res, next, school_id){

  // load school
  School.findById(school_id, function(err, school){
    if (school && !school.status.deleted) {

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


app.param('course_id', function(req, res, next, course_id){

  // load school
  Course.findById(course_id, function(err, course){
    if (course && !course.status.deleted) {

      res.locals.course = course;

      ddd(course);

      if (req.user) {
        res.locals.isadmin = true;
      }
      next();

    } else {
      next('route');
    }
  });
});


app.param('school_edit_section', function(req, res, next, section){

  if (res.locals.sections[section]) {
    res.locals.section = section;
    next();
  } else {
    next('route');
  }

});


// middleware

function load_school_edit_sections(req, res, next) {
  var schooladmin_sections = {
    account: "Account",
    description: "Description",
    contact: "Contact Info",
    courses: "Courses"
  };
  res.locals.sections = schooladmin_sections;

  next();
}

function restricted(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    // TODO: Capture location for redirect after login

    req.session.alerts.push({type:'error', message: 'You don\'t have enough permissions. Please log in!'});
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


function ddd(obj) {
  console.log(obj);
}

////

http.createServer(app).listen(app.get('port'), function(){
  console.log("Sweet Learning: port " + app.get('port'));
});
