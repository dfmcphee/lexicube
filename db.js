module.exports = function(mongoose){
	if (process.env.NODE_ENV === "production") {
		mongoose.connect( "mongodb://nodejitsu:f8098783edd8261a9b1319622f878e6e@alex.mongohq.com:10010/nodejitsudb879188620" );
	}
	else {
		mongoose.connect('mongodb://nodejitsu_dfmcphee:9g1kk3cfcghpcvs1isab3to7vt@ds043937.mongolab.com:43937/nodejitsu_dfmcphee_nodejitsudb5985821569');
	}
	return mongoose;
};