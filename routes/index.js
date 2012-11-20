
/*
 * GET home page.
 */

exports.home = function(req, res){
	res.render('home');
};

exports.me = function(req, res) {
	res.render('me');
};

exports.login = function(req, res) {
	res.render('login');
};

exports.member = function(req, res){
  res.send("member " + req.member.id + ' ' + req.member.name);
};