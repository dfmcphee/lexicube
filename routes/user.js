/*
 * GET user login.
 */

exports.login = function(req, res){
  res.render('login', { title: 'Express', message: ''});
};