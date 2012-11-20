
/*
 * GET users listing.
 */

exports.show = function(req, res){
  res.send("member " + req.member.id + ' ' + req.member.name);
};