/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , connect = require('connect')
  , user = require('./routes/user')
  , http = require('http')
  , passport = require('passport')
  , passportMongoose = require('passport-mongoose')
  , path = require('path');

var app = express();
var io = require('socket.io');

// Mongoose setup
var mongoose = require( 'mongoose' );

var Schema = mongoose.Schema,
ObjectId = Schema.ObjectId;

// Create schemas
var UserSchema = require('./models/user')(Schema, ObjectId);
var CrosswordSchema = require('./models/crossword')(Schema);
CrosswordSchema.set('versionKey', false);
var RoomSchema = require('./models/room')(Schema, ObjectId);

var User = mongoose.model('User', UserSchema);
var Crossword = mongoose.model('Crossword', CrosswordSchema);
var Room = mongoose.model('Room', RoomSchema);

// Connect to db
mongoose = require('./db')(mongoose);

// Import users
var users = require('./users')(passport, passportMongoose, mongoose, User);

// Import app config
require('./config')(app, express, path, passport);

// Import app routes
app = require('./routes/app')(app, routes, user, User);

// Create server
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// Add socket.io to server
io = io.listen(server);

io.configure( function(){
    io.set('log level', 1);
});

// Import game
var game = require('./game')(User, Crossword, Room, http, io);

// Import sockets
require('./sockets')(User, Crossword, Room, game, io);