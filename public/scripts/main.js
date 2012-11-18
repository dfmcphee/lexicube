var socket = io.connect(document.URL);
var grid = [];
var date = [];
var currentWord;
var lastRaptor = 0;
var roomId = 0;

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

// listener, whenever the server emits 'updateusers', this updates the username list
socket.on('updateusers', function(data) {
	$('#users').empty();
	$('#userStyles').empty();
	$.each(data, function(key, value) {
		$('#users').append('<div style="background-color:' + value.color + '">' + value.username + '- Score: ' +  value.score + '</div>');
		$("<style type='text/css'> .selectedBy" + value._id + " { background-color: " + value.color + " !important;} </style>").appendTo("#userStyles");
	});
});

socket.on('updategrid', function(data, room) {
	$('#' + data.side)
		.empty()
		.data('data', data);
	grid = data.grid;
	roomId = room;
	date[data.side] = data.date;
	for (i=0; i < grid.length; i++) {
		if (grid[i].active === "active") {
			var clue = (data.gridnums[i] != '0') ? '<span class="clueNum">' + data.gridnums[i] + '</span>' : '';
			$('#' + data.side).append('<div class="square" data-grid-index=' + i + '>' + clue + '<span class="letter ' + (data.correct[i] ? 'correctWord' : '') + '">' + data.guessed[i] + '</span></div>');
		}
		else {
			$('#' + data.side).append('<div class="square black"></div>');
		}
	}

	$('#faceInfo').html('<strong>FRONT</strong> ' + '<span class="puzzleDate">' + date['front'] + '</span>');
});

socket.on('updateletter', function(data) {
	$('#' + data.side + ' .square[data-grid-index="' + data.index + '"] .letter').html(data.letter);
});

socket.on('refreshuser', function(data) {
	window.location = '/login';
});

socket.on('guessresults', function(data) {
	if (data.result === 'incorrect') {
		var firstSquare = $('#' + data.data.side + ' .square[data-grid-index="' + data.data.firstSquare + '"]').first();
		var word = getWord(firstSquare, data.data.direction);
		for (var i in word.squares){
			var square = word.squares[i];
			$(square).find('.letter:not(.correctWord)').html('');
		}
		if (data.data.user === userId) {
			//play incorrect sound
			var audio = document.getElementById("failSound");
			audio.play();
			//refocus on this word
			currentWord.done = false;
		}
	} else {
		var firstSquare = $('#' + data.data.side + ' .square[data-grid-index="' + data.data.firstSquare + '"]').first();
		var word = getWord(firstSquare, data.data.direction);
		for (var i in word.squares){
			var square = word.squares[i];
			$(square).find('.letter').addClass('correctWord');
		}
		//play correct sound
		var audio = document.getElementById("winSound");
		audio.play();
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

function getWordIndex(clues, num){
	console.log(num);
	for (var i in clues){
		var n = parseInt(clues[i].split('.')[0]);
		console.log(clues[i]);
		if (n == num){
			return i;
		}
	}
}

function getWord(square, direction){
	if ($(square).hasClass('black')){
		return null;
	}
	var word = {
		clue:'',
		squares: [],
		answer: ''
	};
	var face = $(square).parent();
	var data = face.data('data');
	console.log(data);
	var allSquares = face.children();
	var index = $(square).index();
	var start;
	if (direction == 'vertical'){
		while (index >= 15){
			if ($(allSquares[index-15]).hasClass('black')){
				break;
			}else {
				index-=15;
			}
		}
		start = index;
		while(index < allSquares.length){
			word.squares.push(allSquares[index]);
			if ($(allSquares[index+15]).hasClass('black')){
				break;
			}else {
				index+=15;
			}
		}
		word.clue = getClue(data.down, data.gridnums[start]);
		word.index = getWordIndex(data.down, data.gridnums[start]);
	}else {
		var place = index % 15;
		var min = index - place;
		var max = index + (15-place);
		while (index > min){
			if ($(allSquares[index-1]).hasClass('black')){
				break;
			}else {
				index--;
			}
		}
		start = index;
		while(index < max){
			word.squares.push(allSquares[index]);
			if ($(allSquares[index+1]).hasClass('black')){
				break;
			}else {
				index++;
			}
		}
		word.clue = getClue(data.across, data.gridnums[start]);
		word.index = getWordIndex(data.across, data.gridnums[start]);
	}
	console.log(word);
	return word;
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
		//if chat input has focus or the word is done, quit
		if ( $('#data').is(":focus") || currentWord.done){
			return;
		}
		//backspace - delete last letter that's not empty or part of a correct word
		if(e.which == 8) {
			$(currentWord.squares).find('.letter').not(':empty').not('.correctWord').last().html('');
			e.preventDefault();
		}
		//letter
		var letter = String.fromCharCode(e.which);
		letter = letter.match(/[A-Za-z]/);
		if (!letter || letter.length < 1){
			return;
		}
		letter = letter[0];
		var box = false;
		//for each letter in the word
		for (var i in currentWord.squares){
			var square = currentWord.squares[i];
			//if the square contains a letter, skip it
			if ($(square).find('.letter').html() !== ''){
				continue;
			}

			box = square;
			break;
		}

		//add the letter to the current box
		socket.emit('sendletter', {letter:letter, index:$(box).attr('data-grid-index'), side: $(box).closest('.face').attr('id'), roomId: roomId });
		$(box).find('.letter').html(letter);
		
		//if there are no more letters
		if ($(currentWord.squares).find('.letter:empty').length === 0) {
			currentWord.done = true;
		}

		//all letters in word have already been filled, so the word is done
		if (!box || currentWord.done){
			currentWord.done = true;
			var word = '';
			for (var i in currentWord.squares){
				word += $(currentWord.squares[i]).find('.letter').html();
			}
			//check if the word is right
			socket.emit('checkword', { guess: word, user: userId, roomId: roomId, index: currentWord.index, direction: currentWord.direction, side: $(currentWord.squares[0]).closest('.face').attr('id'), firstSquare: $(currentWord.squares[0]).attr('data-grid-index')});
			return;
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
					socket.emit('sendletter', {letter:'', index: index, side: face, roomId: roomId });
				}
				doPrevent = true;
			}
		}

		if (doPrevent) {
			event.preventDefault();
		}
	});

	$(document).on('click', '.square', function(){
		var direction = ($('.selected').hasClass('vertical')) ? 'vertical' : 'horizontal';
		
		if ($(this).hasClass('selected')){
			if ($(this).hasClass('horizontal')){
				direction = 'vertical';
			} else {
				direction = 'horizontal';
			}
		}
		$('.selected').removeClass('selected').removeClass('selectedBy' + userId);
		$('.horizontal').removeClass('horizontal');
		$('.vertical').removeClass('vertical');
		var word = getWord(this, direction);
		if (!word){
			return;
		}
		var clueDir = (direction === 'vertical') ? 'DOWN' : 'ACROSS';
		$('#clue').html('<strong>' + clueDir + '</strong> ' + word.clue);

		//add selection
		var gridIndices = [];
		for (var i in word.squares) {
			gridIndices.push($(word.squares[i]).attr('data-grid-index'));
		}
		socket.emit('updateSelection', { user: userId, gridIndices: gridIndices, side: $(word.squares[0]).closest('.face').attr('id'), wordIndex: word.index, wordDirection: word.direction } );
		$(word.squares).addClass('selected').addClass(direction).addClass('selectedBy' + userId);
		word.direction = direction;

		currentWord = word;
	});
});