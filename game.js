module.exports = function(User, Crossword, Room, http, io){
  // Initialize
  var game = {};
  game.sides = {};
  game.usedDates = {};
  game.rooms = {};

  // Build the grid for crossword
  buildGrid = function(obj, side, roomId) {
      var grid = [];
      // Create empty array for guessed words
      var gridGuessed = [];
      var gridCorrect = [];
      for (i=0; i < 225; i++){
        gridGuessed.push('');
        gridCorrect.push(0);
      }

      // initialize acrossWordGrid with array of 255 empty strings.
      var acrossWordGrid = [];

      for (i=0; i < 225; i++){
        acrossWordGrid.push('');
      }

      // for each word, find gridnum
      for (i=0; i < obj.answers.across.length; i++) {
        word = obj.answers.across[i];
        questionNum = Number(obj.clues.across[i].split('.')[0]);
        start = obj.gridnums.indexOf(questionNum);

        // add wordnum to all letters of word
        for (x=start; x < start + obj.answers.across[i].length; x++) {
          acrossWordGrid[x] = i;
        }
      }

      // initialize downWordGrid with array of 255 empty strings.
      var downWordGrid = [];

      for (i=0; i < 225; i++){
        downWordGrid.push('');
      }

      // for each word, find gridnum
      for (i=0; i < obj.answers.down.length; i++) {
        word = obj.answers.down[i];
        questionNum = Number(obj.clues.down[i].split('.')[0]);
        start = obj.gridnums.indexOf(questionNum);
        end = start + (word.length * 15);

        // add wordnum to all letters of word
        for (x=start; x < end + obj.answers.down[i].length; x += 15) {
          downWordGrid[x] = i;
        }
      }

    // Loop through and process square objects
    for (i=0; i < 225; i++){
      // initialize attributes of square
      var letter = obj.grid[i];
      var num = obj.gridnums[i];
      var active = 'active';
      var wordAcross = '';
      var wordDown = '';

      // disable it is an empty square
      if (letter === ".") {
        letter = '';
        active = 'disabled';
        gridCorrect[i] = 1; // the blank ones are already what they need to be
      }
      // otherwise add words letter belongs to
      else {
        if (acrossWordGrid[i] !== '') {
          wordAcross = acrossWordGrid[i];
        }
        if (downWordGrid[i] !== '') {
          wordDown = downWordGrid[i];
        }
        gridCorrect[i] = 0;
      }

      if (num === 0) {
        num = '';
      }

      item = {letter: '', num: num, active: active, index:i, wordAcross:wordAcross, wordDown: wordDown};

      grid.push(item);
    }

    console.log('Game loaded for: ' + side);
    
    // Create crossword object
    var crossword = {
      side: side,
      grid: grid,
      answers: obj.answers,
      guessed: gridGuessed,
      correct: gridCorrect,
      gridnums: obj.gridnums,
      across: obj.clues.across,
      down: obj.clues.down,
      date: obj.date
    };
    
    // Save new crossword to db
	new Crossword(crossword).save( function( err, saved, count ){
		if (err) {
		  console.log('There was a problem saving crossword.');
		}
		else {
		  Room.findById(roomId, function( err, room ){
		    if (!err && room) {
		      room[side] = saved._id;
		      io.sockets.in(room._id).emit('updategrid', crossword);
		      room.save();
		      //game.rooms[room._id] = {id: room._id};
		      
		      if (side === "bottom") {
			  	io.sockets.in(roomId).emit('showcube');
		      }
		    }
		  });
		}
    });
  };

  // Get a random crossword from xwordinfo
  game.getPuzzle = function(side, roomId) {
    http.get("http://www.xwordinfo.com/JSON/Data.aspx?date=random", function(res) {
      console.log("Got response: " + res.statusCode);
      var data = '';

      res.on('data', function (chunk){
        data += chunk;
      });

      res.on('end',function(){
        var obj = JSON.parse(data);

        Crossword.find({date: obj.date},
          function(err, usedCrossword){
            console.log(usedCrossword);
            // Make sure crossword isn't used already and it is the right size
            if (!err && usedCrossword.length < 1 && game.usedDates[obj.date] === undefined && obj.size.rows === 15 ) {
                var isValid = true;
                // Loop through and check for invalid letters
                for (i=0; i < obj.grid.length; i++){
                  if (obj.grid[i].length > 1) {
                    isValid = false;
                  }
                }
                // If crossword is valid, build grid with it
                if (isValid) {
                  console.log('its good');
                  buildGrid(obj, side, roomId);
                  console.log('face ' + side + ' is using puzzle ');
                  console.log(obj.date);
                  game.usedDates[obj.date] = obj.date;
                }
                // Or try again
                else {
                  console.log('no good');
                  game.getPuzzle(side, roomId);
                }
            }
            // Or try again
            else {
              console.log('no good');
              game.getPuzzle(side, roomId);
            }
          });
      });
    });
  };

  game.findIndexByClue = function(crossword, clue){
  	if (clue){
    var clueId = parseInt(clue.split('.')[0]);
    	return crossword.gridnums.indexOf(clueId);
    }
    else {
    	console.log('Clue not found.');
	    return false;
    }
  };

  game.updateWord = function(err, saved, count){
    if (err) {
      console.log(err);
    }
    else if (count <= 0) {
      console.log('Nothing updated.');
    }
    else {
      console.log('Updated.');
    }
  };

  // Checks if a guess is correct or not
  game.checkWord = function(data){
    if (!data || !data.index){
      console.log('error');
      return;
    }
    
    direction = data.direction;

    Crossword.findById(data.crosswordId, function (err, crossword){
      if (!err && crossword) {
        var result = '';
        var guessLength = data.guess.length;
        
        // If it is a horizontal word
        if (direction === 'across') {
        
          // If guess is correct
          if (data.guess.toUpperCase() === crossword.answers.across[data.index]) {
            var userDidFinish = false;
            var i = game.findIndexByClue(crossword, crossword.across[data.index]);
            
            var guessIndex = 0;
            
            for (var l = data.guess.length+i; i < l + 1; i++){
              if (crossword.correct[i] == 0) {
                crossword.correct[i] = 1;
                crossword.markModified('correct.' + i);
                crossword.guessed[i] = crossword.answers.across[data.index][guessIndex];
                crossword.markModified('guessed.' + i);
                userDidFinish = true;
              }
              guessIndex++;
            }

            if (userDidFinish){
              result = 'correct';
              data.guess = crossword.answers.across[data.index];
            } else {
              result = 'cheating';
            }
          }

          // If not correct, clear guess
          else {
            result = 'incorrect';
            var i = game.findIndexByClue(crossword, crossword.across[data.index]);
            for (var l = data.guess.length+i; i < l; i++) {
              if (crossword.correct[i] !== 1){
                crossword.guessed[i] = '';
                crossword.markModified('guessed.' + i);
              }
            }
          }
        }

        // If it is a vertical word
        else {
        
          // If guess is correct
          if (data.guess.toUpperCase() === crossword.answers.down[data.index]) {
            var userDidFinish = false;
            var i = game.findIndexByClue(crossword, crossword.down[data.index]);
            
            var guessIndex = 0;
            
            for (var l = data.guess.length*15+i; i < l; i+=15){
              if (crossword.correct[i] == 0){
                crossword.correct[i] = 1;
                crossword.markModified('correct.' + i);
                crossword.guessed[i] = crossword.answers.down[data.index][guessIndex];
                crossword.markModified('guessed.' + i);
                userDidFinish = true;
              }
              guessIndex++;
            }

            if (userDidFinish){
              result = 'correct';
              data.guess = crossword.answers.down[data.index];
            } else {
              result = 'cheating';
            }
          }
          
          // If not correct, clear guess
          else {
            result = 'incorrect';
            var i = game.findIndexByClue(crossword, crossword.down[data.index]);
            for (var l = data.guess.length*15+i; i < l; i+=15){
              if (crossword.correct[i] !== 1){
                crossword.guessed[i] = '';
                crossword.markModified('guessed.' + i);
              }
            }
          }
        }
        console.log(data.user);
        
        // If word is correct, update user score
        if (result === 'correct') {
          User.findById(data.user, function(err, user) {
            if (!err && user) {
                var newScore = user.score + guessLength;
                user.score = newScore;
                console.log('updating score: ' + newScore);
                user.save(function(err, save, count) {
                  console.log('user score updated.');
                  
                  var roomUsers = [];
		          var sockets = io.sockets.in(data.roomId).sockets;
		          for (var socketId in sockets) {
			        roomUsers.push(sockets[socketId].username);
		          }
		            
		          // update the list of users in chat, client-side
		          User.find({'username': { $in: roomUsers}}, function(err, users) {
		            // update the list of users in chat, client-side
			        io.sockets.in(data.roomId).emit('updateusers', users);
			        // if the crossword is finished, load a new one
                    if (crossword.correct.indexOf(0) === -1) {
                      console.log('side complete');
                      game.getPuzzle(data.side, data.roomId);
                    }
		          });
                });
              }
          });
        }

        crossword.save(function(err, save, count) {
          if (!err && count > 0) {
         	console.log(data);
         	data.direction = direction;
            io.sockets.in(data.roomId).emit('guessresults', {data: data, result: result});
          }
        });
      }
    });
  };

  // Get each side for the cube
  game.generateRoom = function(roomId) {
    game.getPuzzle('front', roomId);
    game.getPuzzle('back', roomId);
    game.getPuzzle('left', roomId);
    game.getPuzzle('right', roomId);
    game.getPuzzle('top', roomId);
    game.getPuzzle('bottom', roomId);
  };

  return game;
};