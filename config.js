// Configuration module
// All express and connect configuration must be here
module.exports = function(app, express, path, passport){
	app.configure(function(){
		app.set('port', 8000);
		app.set('views', __dirname + '/views');
		app.set('view engine', 'ejs');
		app.use(express.favicon());
		app.use(express.logger('dev'));
		app.use(express.cookieParser());
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(express.session({ secret: 'mqNL]dZ89#*l(DCdEL1%yQ2#R~xIfv[qVCvj-~TW' }));
		// Initialize Passport!Also use passport.session() middleware, to support
		// persistent login sessions (recommended).
		app.use(passport.initialize());
		app.use(passport.session());
		app.use(app.router);
		app.use(require('less-middleware')({ src: __dirname + '/public' }));
		app.use(express.static(path.join(__dirname, 'public')));
	});

	app.configure('development', function(){
		app.use(express.errorHandler());
	});
};