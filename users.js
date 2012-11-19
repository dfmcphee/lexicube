module.exports = function(passport, passportMongoose, mongoose, User){
	var users = {};

	// Simple route middleware to ensure user is authenticated.
	//   Use this route middleware on any resource that needs to be protected.  If
	//   the request is authenticated (typically via a persistent login session),
	//   the request will proceed.  Otherwise, the user will be redirected to the
	//   login page.
	users.ensureAuthenticated = function(req, res, next) {
		if (req.isAuthenticated()) { return next(); }
		res.redirect('/users');
	};

	// Passport session setup.
	//   To support persistent login sessions, Passport needs to be able to
	//   serialize users into and deserialize users out of the session.  Typically,
	//   this will be as simple as storing the user ID when serializing, and finding
	//   the user by ID when deserializing.
	passport.serializeUser(function(user, done) {
		done(null, user._id);
	});

	passport.deserializeUser(function(id, done) {
			User.findById(id, function (err, user) {
			done(err, user);
		});
	});

	// Enable the Passport-Mongoose authenticiation strategy.
	// Uses reasonable defaults that can be overridden.
	passport.use(new passportMongoose.Strategy({connection: mongoose}));

	return users;
};