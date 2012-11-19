module.exports = function(mongoose){
	mongoose.connect( 'mongodb://nodejitsu:f8098783edd8261a9b1319622f878e6e@alex.mongohq.com:10010/nodejitsudb879188620' );

	return mongoose;
};