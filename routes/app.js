module.exports = function(app, routes, passport, user, User){
  app.get('/', routes.index);
  app.get('/login', user.login);

  app.post('/login', function(req, resp){
    User.findOne({username: req.body.username}, function (err, user) {
      if (user) {
        req.logIn(user, function(err) {
          if (err) {
            return err;
          }
          // login success!
          resp.redirect('/');
        });
      }
      else {
        req.flash('error', "User not found.");
        resp.redirect('/login');
      }
    });
  });

  app.post('/register', function(req, resp){
    var username = req.body.username.replace(/(<([^>]+)>)/ig,"");
    User.find({username: username}, function (err, users) {
      if (users.length <= 0) {
        new User({
          username: username,
          score: 0
        }).save( function( err, user, count ){
          req.logIn(user, function(err) {
            if (err) {
              return err;
            }
            // login success!
            resp.redirect('/');
          });
        });
      }
      else {
        req.flash('error', "Username already taken.");
        resp.redirect('/login');
      }
    });
  });

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });

  return app;
};