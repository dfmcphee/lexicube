module.exports = function(User, Crossword, Room, game, io){
  letterQueue = {};
  
  io.sockets.on('connection', function (socket) {
    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
      // we tell the client to execute 'updatechat' with 2 parameters
      io.sockets.emit('updatechat', socket.username, data);
    });

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function(data){
      socket.emit('loading');

      // we store the username in the socket session for this client
      socket.username = data.username;
      socket.userId = data.id;
      socket.userColor = data.color;

      User.findById(data.id, function(err, user) {
        if (user) {
          Room.where('players').lt(13).exec(function(err, rooms){
            // If there is a room with space, join it
            if (!err && rooms && rooms.length > 0) {
              var room = rooms[0];
              socket.roomId = room._id;
              room.players = room.players + 1;
              room.save();

              socket.join(room._id);

              // Update grids for each side
              Crossword.findById(room.front, function(err, crossword){
                io.sockets.in(socket.roomId).emit('updategrid', crossword, socket.roomId, crossword._id);
              });

              Crossword.findById(room.back, function(err, crossword){
                io.sockets.in(socket.roomId).emit('updategrid', crossword, socket.roomId, crossword._id);
              });

              Crossword.findById(room.left, function(err, crossword){
                io.sockets.in(socket.roomId).emit('updategrid', crossword, socket.roomId, crossword._id);
              });

              Crossword.findById(room.right, function(err, crossword){
                io.sockets.in(socket.roomId).emit('updategrid', crossword, socket.roomId, crossword._id);
              });

              Crossword.findById(room.top, function(err, crossword){
                io.sockets.in(socket.roomId).emit('updategrid', crossword, socket.roomId, crossword._id);
              });

              Crossword.findById(room.bottom, function(err, crossword){
                io.sockets.in(socket.roomId).emit('updategrid', crossword, socket.roomId, crossword._id);
              });
            }
            else {
              // Otherwise create a new room
              new Room({players: 1}).save( function( err, newRoom, count ){
                if (err) {
                  console.log('There was a problem saving the room.');
                }
                else {
                  socket.roomId = newRoom._id;
                  socket.join(newRoom._id);
                  console.log(socket.roomId);
                  game.generateRoom(newRoom._id);
                  console.log('Room generated.');
                }
              });
            }
            // Update attributes
            user.color = data.color;
            user.online = true;

            console.log(socket.roomId);

            user.currentRoom = socket.roomId;

            user.save( function ( err, user, count ){
              if( err ) return next( err );
                // echo globally (all clients) that a person has connected
                socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has connected');
                // update the list of users in chat, client-side
                User.find({online: true, currentRoom: socket.roomId}, function(err, users) {
                  io.sockets.in(socket.roomId).emit('updateusers', users);
                });
            });
          });
        }
        else {
          socket.emit('refreshuser', data.id);
        }
      });
    });

    socket.on('updateSelection', function(data) {
      console.log('user #' + data.user + ' has selected a word');
      io.sockets.in(socket.roomId).emit('updateSelections', data);
    });

    socket.on('sendletter', function (data) {
        saveLetter(data);
    });
    
    // Saves sent letter in guessed
    function saveLetter(data) {    	
    	console.log(letterQueue[data.gameId]);
    	
		Crossword.findById(data.crosswordId, function(err, crossword) {
	        if (!crossword || err){
	          return;
	        }

		    crossword.guessed[data.index] = data.letter;
	        
	        crossword.markModified('guessed.' + data.index);
	
	        crossword.save(function ( err, saved, count ){
	          if (!err && count > 0) {
	            console.log('Letter saved.');
	            
	            // Check if word across is complete
	            word = completeWord(crossword, data.firstIndex, 'across');
	            if (word.isFinished) {
	              console.log('word finished.');
	              data.direction = 'across';
	              data.guess = word.guess;
	              data.answerIndex = word.answerIndex;
	              game.checkWord(data);
	            }
	            
	            // Check if word down is complete
	            word = completeWord(crossword, data.firstIndex, 'down');
	            if (word.isFinished) {
	              data.direction = 'down';
	              data.guess = word.guess;
	              data.answerIndex = word.answerIndex;
	              game.checkWord(data);
	            }
	            
	            // Send updateletter to users
	            //socket.broadcast.in(socket.roomId).emit('updateletter', data);
	            io.sockets.in(socket.roomId).emit('updateletter', data);
	          }
	          else {
	            console.log('Could not save letter.');
	            console.log(err);
	          }
	        });
        });
    }

    function completeWord(crossword, index, direction){
      var word = {};

      word.guess = '';
      wordAcross = '';
      wordDown = '';
      
      if (direction === 'across') {
        acrossIndex = crossword.grid[index].wordAcross;
        letterIndex = Number(index);
        for (i = 0; i < crossword.answers.across[acrossIndex].length; i++) {
            wordAcross += crossword.guessed[letterIndex];
            letterIndex++;
        }
        console.log(wordAcross);
        if (wordAcross.length === crossword.answers.across[acrossIndex].length) {
          word.isFinished = true;
          word.guess = wordAcross;
          word.answerIndex = acrossIndex;
        }
        else {
          word.isFinished = false;
        }
      }
      else {
        downIndex = crossword.grid[index].wordDown;
        letterIndex = Number(index);
        for (i = 0; i < crossword.answers.down[downIndex].length; i++) {
            wordDown += crossword.guessed[letterIndex];
            letterIndex += 15;
        }
        if (wordDown.length === crossword.answers.down[downIndex].length) {
          word.isFinished = true;
          word.guess = wordDown;
          word.answerIndex = downIndex;
        }
        else {
          word.isFinished = false;
        }
      }
      return word;
    }

    // when the user disconnects.. perform this
    socket.on('disconnect', function(){
      User.findById(socket.userId, function(err, user) {
        if (user) {
          // Update attributes
          user.online = false;
          user.currentRoom = null;
          user.save( function ( err, saved, count ){
            if (!err && count > 0) {
              Room.findById(socket.roomId, function(err, room) {
                if (room) {
                  room.players = room.players - 1;
                  room.save();
                  // update the list of users in chat, client-side
                  User.find({online: true, currentRoom: socket.roomId}, function(err, users) {
                    io.sockets.in(socket.roomId).emit('updateusers', users);
                  });

                  // echo globally that this client has left
                  socket.broadcast.in(socket.roomId).emit('updatechat', 'SERVER', socket.username + ' has disconnected');
                }
              });
            }
            else {
              console.log('Could not update user.');
            }
          });
        }
      });
    });
  });
};