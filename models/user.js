module.exports = function(Schema, ObjectId){
	var UserSchema = new Schema({
		username: String,
		score: Number,
		online: Boolean,
		color: String,
		currentRoom: ObjectId
	});
	return UserSchema;
};