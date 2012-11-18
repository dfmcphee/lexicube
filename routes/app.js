module.exports = function(app, routes, user, User){
  app.get('/', routes.index);
  app.get('/login', user.login);

  app.post('/register', function(req, resp){
    var username = req.body.username.replace(/(<([^>]+)>)/ig,"");

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
  });

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });

  return app;
};