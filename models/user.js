module.exports = function(Schema){
	var UserSchema = new Schema({
		username: String,
		score: Number,
		online: Boolean,
		color: String
	});
	return UserSchema;
};