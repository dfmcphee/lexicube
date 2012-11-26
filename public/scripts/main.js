var socket = io.connect(document.URL);
var grid = [];
var date = [];
var currentWord;
var lastRaptor = 0;
var roomId = 0;
var sides = {};

var sendingLetter = false;

var letterQueue = [];

// on connection to server, ask for user's name with an anonymous callback
socket.on('connect', function(){
	// call the server-side function 'adduser' and send one parameter (value of prompt)
	//var color = '#' + Math.floor(Math.random()*16777215).toString(16);
	var red = Math.floor(Math.random()*100) + 140,
		blue = Math.floor(Math.random()*100) + 140,
		green = Math.floor(Math.random()*100) + 140;
	var color = 'rgb(' + red + ', ' + green + ', ' + blue + ')';
	socket.emit('adduser', {username: username, id: userId, color: color});
});

// listener, whenever the server emits 'updatechat', this updates the chat body
socket.on('updatechat', function (username, data) {
	if (data === 'raptorize'){
		if (new Date - lastRaptor > 60000){
			$(document).raptorize({enterOn:'timer',delayTime:2000});
			lastRaptor = +new Date;
		}
		return;
	}
	var convo = $('#conversation');
	data = data.replace(/(<([^>]+)>)/ig,"");
	convo.append('<b>'+username + ':</b> ' + data + '<br>');
	convo.scrollTop(convo.prop('scrollHeight'));
});

// animation for loading game
socket.on('loading', function() {
	$('<div>').addClass('loading-animation')
		.append('<div class="wrapper"><div class="inner"><span>L</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span></div>')
		.appendTo('.face');
});

// listener, whenever the server emits 'updateusers', this updates the username list
socket.on('updateusers', function(data) {
	$('#users').empty();
	$('#userStyles').empty();
	$.each(data, function(key, value) {
		$('#users').append('<div style="background-color:' + value.color + '">' + value.username + '- Score: ' +  value.score + '</div>');
		$("<style type='text/css'> .selectedBy" + value._id + " { background-color: " + value.color + " !important;} </style>").appendTo("#userStyles");
	});
});

socket.on('updategrid', function(data, roomId, side) {
	if (roomId === 0) {
		window.location ="/'";
	}
	else {
		sides[data.side] = side;

		$('#' + data.side)
			.empty()
			.data('data', data);
		grid = data.grid;
		date[data.side] = data.date;
		for (i=0; i < grid.length; i++) {
			if (grid[i].active === "active") {
				var clue = (data.gridnums[i] != '0') ? '<span class="clueNum">' + data.gridnums[i] + '</span>' : '';
				$('#' + data.side).append('<div class="square" data-grid-index=' + i + ' data-word-across="' + data.grid[i].wordAcross + '" data-word-down="' + data.grid[i].wordDown + '" >' + clue + '<span class="letter ' + (data.correct[i] ? 'correctWord' : '') + '">' + data.guessed[i] + '</span></div>');
			}
			else {
				$('#' + data.side).append('<div class="square black"></div>');
			}
		}

		$('#faceInfo').html('<strong>FRONT</strong> ' + '<span class="puzzleDate">' + date['front'] + '</span>');
	}
});

socket.on('updateletter', function(data) {
	sendingLetter = false;
	$('#' + data.side + ' .square[data-grid-index="' + data.index + '"] .letter').html(data.letter);
});

socket.on('refreshuser', function(data) {
	window.location = '/login';
});

socket.on('guessresults', function(data) {
	if (data.result === 'correct') {
		var firstSquare = $('#' + data.data.side + ' .square[data-grid-index="' + data.data.firstIndex + '"]').first();
		var word = getWord(firstSquare, data.data.direction);
		
		$(word.squares).each(function(index, square) {
			$(square).find('.letter').addClass('correctWord');
			$(square).find('.letter').html(data.data.guess[index]);
		});

		//play correct sound
		var audio = document.getElementById("winSound");
		audio.play();
	}
	else {
		console.log(data);
		var firstSquare = $('#' + data.data.side + ' .square[data-grid-index="' + data.data.firstIndex + '"]').first();
		var word = getWord(firstSquare, data.data.direction);
		$(word.squares).each(function(index, square) {
			$(square).find('.letter:not(.correctWord)').html('');
		});

		if (data.data.user === userId) {
			//play incorrect sound
			var audio = document.getElementById("failSound");
			audio.play();
			//refocus on this word
			currentWord.done = false;
			$(currentWord.squares).find('.letter').not(':empty').not('.correctWord').last().html('');
		}
	}
});

socket.on('updateSelections', function(data) {
	console.log('Player ' + data.user + ' just made a new selection of word index ' + data.wordIndex + ' and square indices ' + data.gridIndices + ' on ' + data.side);
    
    //if this wasn't you, remove their other selections and highlight this one
    if (data.user !== userId) {
		$('.selectedBy' + data.user).removeClass('selectedBy' + data.user);
		for (var i in data.gridIndices) {
			$('#' + data.side + ' .square[data-grid-index=' + data.gridIndices[i] + ']').addClass('selectedBy' + data.user);
		}
    }
});

function getClue(clues, num){
	console.log(num);
	for (var i in clues){
		var n = parseInt(clues[i].split('.')[0]);
		console.log(clues[i]);
		if (n == num){
			return clues[i];
		}
	}
}

function getWord(square, direction){
	if ($(square).hasClass('black')){
		return null;
	}

	var word = {};
	var face = $(square).parent().attr('id');
	var data = $('#' + face).data('data');

	console.log(data);
	if (direction == 'across'){
		wordIndex = $(square).attr('data-word-across');
		allSquares = $('#' + face + ' [data-word-across="' + wordIndex + '"]');
		word.squares = allSquares;
		word.clue = word.clue = data.across[wordIndex];
		word.index = wordIndex;
	}
	else {
		wordIndex = $(square).attr('data-word-down');
		allSquares = $('#' + face + ' [data-word-down="' + wordIndex + '"]');
		word.squares = allSquares;
		word.clue = data.down[wordIndex];
		word.index = wordIndex;
	}
	console.log(word);

	return word;
}

function sendLetter() {
	e = letterQueue.shift();

	if(e.which == 8) {
		$(currentWord.squares).find('.letter').not(':empty').not('.correctWord').last().html('');
		e.preventDefault();
	}
	// letter
	var letter = String.fromCharCode(e.which);
	letter = letter.match(/[A-Za-z]/);
	if (!letter || letter.length < 1){
		return;
	}
	letter = letter[0];
	var box = false;
	// for each letter in the word
	for (i=0; i < currentWord.squares.length; i++) {
		var square = currentWord.squares[i];
		// if the square contains a letter, skip it
		if ($(square).find('.letter').html() !== ''){
			continue;
		}
	
		box = square;
		break;
	}
	
	var currentSide = $(box).closest('.face').attr('id');
	
	sendingLetter = true;
	
	// add the letter to the current box
	socket.emit('sendletter', {
		letter:letter,
		index:$(box).attr('data-grid-index'),
		firstIndex:$(currentWord.squares[0]).attr('data-grid-index'),
		side: currentSide, 
		roomId: roomId, 
		crosswordId: sides[currentSide],
		user: userId
	});
	$(box).find('.letter').html(letter);
	
	if (letterQueue.length > 0) {
		sendLetter();
	}
}

// on load of page
$(function(){
	// when the client clicks SEND
	$('#datasend').click( function() {
		var message = $('#data').val();
		$('#data').val('');
		// tell server to execute 'sendchat' and send along one parameter
		if (message) {
			socket.emit('sendchat', message);
		}
		$('#data').focus();
	});

	// when the client hits ENTER on their keyboard
	$('#data').keypress(function(e) {
		if(e.which == 13) {
			$(this).blur();
			$('#datasend').focus().click();
		}
	});
	
	$(document).keypress(function(e){
		// if chat input has focus or the word is done, quit
		if ( $('#data').is(":focus") || currentWord.done){
			return;
		}
		// backspace - delete last letter that's not empty or part of a correct word
		
		if (letterQueue.length < 1) {
			letterQueue.push(e);
			sendLetter();
		}
		else {
			letterQueue.push(e);
		}
	});

	// Prevent the backspace key from navigating back.
	$(document).unbind('keydown').bind('keydown', function (event) {
		var doPrevent = false;
		if (event.keyCode === 8) {
			var d = event.srcElement || event.target;
			if ((d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD')) || d.tagName.toUpperCase() === 'TEXTAREA') {
				doPrevent = d.readOnly || d.disabled;
			}
			else {
				if ($(currentWord.squares).find('.letter').not(':empty').not('.correctWord').last()) {
					var index = $(currentWord.squares).find('.letter').not(':empty').not('.correctWord').last().closest('.square').attr('data-grid-index');
					var face = $(currentWord.squares).find('.letter').not(':empty').not('.correctWord').last().closest('.face').attr('id');
					$(currentWord.squares).find('.letter').not(':empty').not('.correctWord').last().html('');
					socket.emit('sendletter', {
						letter:'',
						index:index,
						firstIndex:$(currentWord.squares[0]).attr('data-grid-index'),
						side: face,
						roomId: roomId,
						crosswordId: sides[face],
						user: userId
					});
				}
				doPrevent = true;
			}
		}

		if (doPrevent) {
			event.preventDefault();
		}
	});

	$(document).on('click', '.square', function(){
		var direction = ($('.selected').hasClass('down')) ? 'down' : 'across';
		
		if ($(this).hasClass('selected')){
			if ($(this).hasClass('across')){
				direction = 'down';
			} else {
				direction = 'across';
			}
		}
		$('.selected').removeClass('selected').removeClass('selectedBy' + userId);
		$('.across').removeClass('across');
		$('.down').removeClass('down');
		var word = getWord(this, direction);
		if (!word){
			return;
		}
		var clueDir = (direction === 'down') ? 'DOWN' : 'ACROSS';
		$('#clue').html('<strong>' + clueDir + '</strong> ' + word.clue);

		//add selection
		var gridIndices = [];
		$(word.squares).each(function(index, square) {
			gridIndices.push($(square).attr('data-grid-index'));
		});
		socket.emit('updateSelection', { user: userId, gridIndices: gridIndices, side: $(word.squares[0]).closest('.face').attr('id'), wordIndex: word.index, wordDirection: word.direction } );
		$(word.squares).addClass('selected').addClass(direction).addClass('selectedBy' + userId);
		word.direction = direction;

		currentWord = word;
	});
});