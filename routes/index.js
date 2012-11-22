/*
 * GET home page.
 */

exports.index = function(req, res){
	if (req.isAuthenticated()) {
		console.log(req.user);
		res.render('index', { title: 'LexiCube', user: req.user});
	}
	else {
		res.redirect('/login');
	}
};