module.exports = function(User, Crossword, Room, http, io){
  // Initialize
  var game = {};
  game.sides = {};
  game.usedDates = {};

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

     new Crossword(crossword).save( function( err, saved, count ){
        if (err) {
          console.log('There was a problem saving crossword.');
        }
        else {
          Room.findById(roomId, function( err, room ){
            if (!err && room) {
              room[side] = saved._id;
              io.sockets.emit('updategrid', crossword);
              room.save();
            }
            else {
              room[side] = saved._id;
              room.save();
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
            if (usedCrossword.length < 1 && game.usedDates[obj.date] === undefined && obj.size.rows === 15 ) {
                console.log('its good');
                buildGrid(obj, side, roomId);
                console.log('face ' + side + ' is using puzzle ');
                console.log(obj.date);
                game.usedDates[obj.date] = obj.date;
            }
            else {
              console.log('no good');
              game.getPuzzle(side, roomId);
            }
          });
      });
    });
  };

  game.findIndexByClue = function(crossword, clue){
    var clueId = parseInt(clue.split('.')[0]);
    return crossword.gridnums.indexOf(clueId);
  };

  // Get the word going direction from that cell that is clicked
  game.getWordFromIndex = function(crossword, direction, index){
    var word = {
      complete: false,
      letters : '',
      index   : null,
      first   : null
    };
    //console.log(index);
    if (direction == 'vertical'){
      while (index >= 15){
        if (crossword.grid[index-15].active == 'disabled'){
          break;
        } else {
          index-=15;
        }
      }
      start = index;
      while (index < crossword.grid.length){
        word.letters += crossword.guessed[index] || ' ';
        if (crossword.grid[index+15] && crossword.grid[index+15].active == 'disabled'){
          break;
        } else {
          index+=15;
        }
      }
      //console.log(start);
      word.index = crossword.gridnums[start]-1;
    } else {
      var place = index % 15;
      var min = index - place;
      var max = index + (15-place);
      while (index > min){
        if (crossword.grid[index-1].active == 'disabled'){
          break;
        } else {
          index--;
        }
      }

      start = index;
      //console.log(start);
      while (index < crossword.grid.length){
        word.letters += crossword.guessed[index] || ' ';
        if (crossword.grid[index+1] && crossword.grid[index+1].active == 'disabled'){
          break;
        } else {
          index++;
        }
      }
      word.index = crossword.gridnums[start]-1;
    }
    if (word.letters.indexOf(' ') == -1){
      word.complete = true;
    }
    word.first = start;
    return word;
  };

  // Checks if a guess is correct or not
  game.checkWord = function(data){
    if (!data ||
        !data.index){
      return;
    }

    Room.findById(data.roomId, function(err, room){
      if (!err && room) {
        Crossword.findById(room[data.side], function (err, crossword){
          console.log(room[data.side]);
          if (!err && crossword) {
            var result = '';
            var intersections = [];
            var intersection = data.direction == 'horizontal' ? 'vertical' : 'horizontal';

            if (data.direction === 'horizontal') {
              if (data.guess.toUpperCase() === crossword.answers.across[data.index]) {
                var userDidFinish = false;
                var i = game.findIndexByClue(crossword, crossword.across[data.index]);
                for (var l = data.guess.length+i; i < l; i++){
                  if (crossword.correct[i] == 0) {
                    crossword.correct[i] = 1;
                    crossword.guessed[i] = data.guess[l];
                    intersections.push(game.getWordFromIndex(crossword, intersection, i));
                    userDidFinish = true;
                  }
                }
                if (userDidFinish){
                  result = 'correct';
                  data.guess = crossword.answers.across[data.index];
                } else {
                  result = 'cheating';
                }
              }
              else {
                result = 'incorrect';
                var i = game.findIndexByClue(crossword, crossword.across[data.index]);
                for (var l = data.guess.length+i; i < l; i++) {
                  if (crossword.correct[i] !== 1){
                    crossword.guessed[i] = '';
                  }
                }
              }
            }
            else if (data.direction === 'vertical') {
              if (data.guess.toUpperCase() === crossword.answers.down[data.index]) {
                var userDidFinish = false;
                var i = game.findIndexByClue(crossword, crossword.down[data.index]);
                for (var l = data.guess.length*15+i; i < l; i+=15){
                  if (crossword.correct[i] == 0){
                    crossword.correct[i] = 1;
                    crossword.guessed[i] = data.guess[l];
                    intersections.push(game.getWordFromIndex(crossword, intersection, i));
                    userDidFinish = true;
                  }
                }
                if (userDidFinish){
                  result = 'correct';
                  data.guess = crossword.answers.across[data.index];
                }else {
                  result = 'cheating';
                }
              }
              else {
                result = 'incorrect';
                var i = game.findIndexByClue(crossword, crossword.down[data.index]);
                for (var l = data.guess.length*15+i; i < l; i+=15){
                  if (crossword.correct[i] !== 1){
                    crossword.guessed[i] = '';
                  }
                }
              }
            }
            // If word is correct, update user score
            if (result === 'correct') {
              User.findById(data.user, function(err, user) {
                if (user) {
                    var newScore = user.score + data.guess.length;
                    user.score = newScore;
                    user.save();

                    crossword.markModified('correct');

                    // update the list of users in chat, client-side
                    User.find({online: true}, function(err, users) {
                      io.sockets.emit('updateusers', users);
                    });

                    if (crossword.correct.indexOf(0) === -1) {
                      console.log('side complete');
                      getPuzzle(data.side, data.roomId);
                    }
                }
              });
            }

            crossword.markModified('guessed');

            // Send letters in word for guess
            crossword.save(function (err, savedCrossword, count){
              if (!err) {
                console.log('Crossword saved.');
                io.sockets.emit('guessresults', {data: data, result: result});
                data.direction = intersection;
                for(var index in intersections){
                  //console.log(intersections[index]);
                  if (!intersections[index].complete){
                    continue;
                  }
                  data.firstSquare = intersections[index].first+"";
                  data.guess = intersections[index].letters+"";
                  data.index = intersections[index].index+"";
                  checkWord(data);
                }
              }
              else {
                console.log(err);
                crossword.save();
                io.sockets.emit('guessresults', {data: data, result: result});
              }
            });
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