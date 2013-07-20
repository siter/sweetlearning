exports.edit_sections = function (req, res, next) {
  var schooladmin_sections = {
    account: "Account",
    description: "Description",
    contact: "Contact Info",
    courses: "Courses"
  };
  res.locals.sections = schooladmin_sections;

  next();
}
