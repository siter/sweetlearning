module.exports = function(swig) {
  swig.setFilter('shorten', shorten);
}



function shorten(input, max_length) {
  return input.toString().substring(0, max_length);
};
