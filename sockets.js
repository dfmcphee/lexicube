module.exports = function(User, Crossword, Room, game, io){

  function countUsers(roomId) {
    var count=0;
    for(var i in io.sockets.in(roomId).sockets) {
    	count++;
    }
    console.log('Players connected: ' + count);
    return count;
  }
  
  function createRoom() {
	  new Room({players: 1}).save( function( err, newRoom, count ){
        if (err) {
          console.log('There was a problem saving the room.');
        }
        else {
          game.generateRoom(newRoom._id);
          
          console.log('Room created with id: ' + newRoom._id);
        }
      });
  }
  
  // Create a new room if none exist
  Room.find(function(err, rooms){
	if (!err && rooms && rooms.length < 1) {
		createRoom();
	}
  });
  
  io.sockets.on('connection', function (socket) {
    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
      // we tell the client to execute 'updatechat' with 2 parameters
      io.sockets.emit('updatechat', socket.username, data);
    });
    
    socket.on('showcube', function(data){ 
	    
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
              room.players = countUsers(room._id);;
              socket.join(room._id);
              
              // If the next player will need a room, create one
              if (room.players > 12) {
	              createRoom();
              }
              
              room.save();

              // Update grids for each side
              Crossword.findById(room.front, function(err, crossword){
                socket.emit('updategrid', crossword, socket.roomId, crossword._id);
                if (crossword.correct.indexOf(0) === -1) {
					console.log('side complete');
					game.getPuzzle('front', socket.roomId);
                }
              });

              Crossword.findById(room.back, function(err, crossword){
                socket.emit('updategrid', crossword, socket.roomId, crossword._id);
                if (crossword.correct.indexOf(0) === -1) {
					console.log('side complete');
					game.getPuzzle('back', socket.roomId);
                }
              });

              Crossword.findById(room.left, function(err, crossword){
                socket.emit('updategrid', crossword, socket.roomId, crossword._id);
                if (crossword.correct.indexOf(0) === -1) {
					console.log('side complete');
					game.getPuzzle('left', socket.roomId);
                }
              });

              Crossword.findById(room.right, function(err, crossword){
                socket.emit('updategrid', crossword, socket.roomId, crossword._id);
                if (crossword.correct.indexOf(0) === -1) {
					console.log('side complete');
					game.getPuzzle('right', socket.roomId);
                }
              });

              Crossword.findById(room.top, function(err, crossword){
              	socket.emit('updategrid', crossword, socket.roomId, crossword._id);
              	if (crossword.correct.indexOf(0) === -1) {
					console.log('side complete');
					game.getPuzzle('top', socket.roomId);
                }
              });

              Crossword.findById(room.bottom, function(err, crossword){
                socket.emit('updategrid', crossword, socket.roomId, crossword._id);
                if (crossword.correct.indexOf(0) === -1) {
					console.log('side complete');
					game.getPuzzle('bottom', socket.roomId);
                }
                socket.emit('showcube');
                updateUser(user, User, socket, io, data.color);
              });
            }
            else {
              // If no rooms are found, create a new room
		      new Room({players: 1}).save( function( err, newRoom, count ){
		        if (err) {
		          console.log('There was a problem saving the room.');
		        }
		        else {
		          socket.roomId = newRoom._id;
		          socket.join(newRoom._id);
		          
		          game.generateRoom(newRoom._id);
		          
		          console.log('Room created with id: ' + socket.roomId);
		          
		          updateUser(user, User, socket, io, data.color);
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
    
    function updateUser(user, User, socket, io, color) {
	    user.color = color;
        user.online = true;
        user.currentRoom = socket.roomId;

        user.save( function ( err, user, count ){
          if( err ) return next( err );
            // echo globally (all clients) that a person has connected
            socket.broadcast.in(socket.roomId).emit('updatechat', 'SERVER', socket.username + ' has connected');
            
            var roomUsers = [];
            var sockets = io.sockets.in(socket.roomId).sockets;
            for (var socketId in sockets) {
	        	roomUsers.push(sockets[socketId].username);
            }
            
            // update the list of users in chat, client-side
            User.find({'username': { $in: roomUsers}}, function(err, users) {
              io.sockets.in(socket.roomId).emit('updateusers', users);
            });
        });
    }

    socket.on('updateSelection', function(data) {
      console.log('user #' + data.user + ' has selected a word');
      io.sockets.in(socket.roomId).emit('updateSelections', data);
    });

    socket.on('sendletter', function (data) {
        saveLetter(data);
    });
    
    socket.on('checkword', game.checkWord);
    
    // Saves sent letter in guessed
    function saveLetter(data) {    	
		Crossword.findById(data.crosswordId, function(err, crossword) {
	        if (!crossword || err){
	          return;
	        }
	        if (crossword.correct[data.index] === 0) {
			    crossword.guessed[data.index] = data.letter;
		        
		        crossword.markModified('guessed.' + data.index);
		
		        crossword.save(function ( err, saved, count ){
		          if (!err && count > 0) {
		            console.log('Letter saved.');
		            
		            // Send updateletter to users
		            socket.broadcast.in(socket.roomId).emit('updateletter', data);
		          }
		          else {
		            console.log('Could not save letter.');
		            console.log(err);
		          }
		        });
	        }
        });
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
                  room.players = countUsers(room._id);
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