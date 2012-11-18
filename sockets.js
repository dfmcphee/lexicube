module.exports = function(User, Crossword, Room, game, io){
  io.sockets.on('connection', function (socket) {
    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
      // we tell the client to execute 'updatechat' with 2 parameters
      io.sockets.emit('updatechat', socket.username, data);
    });

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function(data){
      // we store the username in the socket session for this client
      socket.username = data.username;
      socket.userId = data.id;
      socket.userColor = data.color;

      User.findById(socket.userId, function(err, user) {
          if (user) {
            // Update attributes
            user.color = data.color;
            user.online = true;
            user.save( function ( err, user, count ){
              if( err ) return next( err );
                // echo globally (all clients) that a person has connected
                socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has connected');
                // update the list of users in chat, client-side
                User.find({online: true}, function(err, users) {
                  io.sockets.emit('updateusers', users);
                });
            });

            Room.where('players').lt(13).exec(function(err, rooms){
              // If there is a room with space, join it
              if (!err && rooms && rooms.length > 0) {
                var room = rooms[0];
                socket.roomId = room._id;
                room.players = room.players + 1;
                room.save();

                // Update grids for each side
                Crossword.findById(room.front, function(err, crossword){
                  io.sockets.emit('updategrid', crossword, socket.roomId);
                });

                Crossword.findById(room.back, function(err, crossword){
                  io.sockets.emit('updategrid', crossword, socket.roomId);
                });

                Crossword.findById(room.left, function(err, crossword){
                  io.sockets.emit('updategrid', crossword, socket.roomId);
                });

                Crossword.findById(room.right, function(err, crossword){
                  io.sockets.emit('updategrid', crossword, socket.roomId);
                });

                Crossword.findById(room.top, function(err, crossword){
                  io.sockets.emit('updategrid', crossword, socket.roomId);
                });

                Crossword.findById(room.bottom, function(err, crossword){
                  io.sockets.emit('updategrid', crossword, socket.roomId);
                });

                console.log(room);
              }
              else {
                // Otherwise create a new room
                new Room({players: 1}).save( function( err, newRoom, count ){
                  if (err) {
                    console.log('There was a problem saving the room.');
                  }
                  else {
                    socket.roomId = newRoom._id;
                    game.generateRoom(newRoom._id);
                    console.log('Room generated.');
                  }
                });
              }
            });
          }
          else {
            socket.emit('refreshuser', data.id);
          }
      });
    });

    socket.on('updateSelection', function(data) {
      console.log('user #' + data.user + ' has selected a word');
      io.sockets.emit('updateSelections', data);
    });

    socket.on('checkword', game.checkWord);

    socket.on('sendletter', function (data) {
      Room.findById(socket.roomId, function(err, room) {
        if (room) {
          Crossword.findById(room[data.side], function(err, crossword) {
            if (!crossword || err){
              return;
            }
            crossword.guessed[data.index] = data.letter;
            
            crossword.markModified('guessed');

            crossword.save(function ( err, saved, count ){
              if (!err && count > 0) {
                console.log('Send letter- Crossword saved.');
              }
              else {
                console.log('Could not save. Trying again.');
                crossword.save(function ( err, saved, count ){
                  if (err && count > 0) {
                    console.log('Could not save. Trying again.');
                  }
                  else {
                    console.log('Succeeded.');
                  }
                });
              }
              socket.broadcast.emit('updateletter', data);
            });
          });
        }
      });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function(){
      User.findById(socket.userId, function(err, user) {
        if (user) {
          // Update attributes
          user.online = false;
          user.save( function ( err, user, count ){
            if( err ) return next( err );
            Room.findById(socket.roomId, function(err, room) {
              if (room) {
                room.players = room.players - 1;
                room.save();
              }
            });
          });
        }
      });

      // update the list of users in chat, client-side
      User.find({online: true}, function(err, users) {
        io.sockets.emit('updateusers', users);
      });

      // echo globally that this client has left
      socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    });
  });
};