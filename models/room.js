module.exports = function(Schema, ObjectId){
	var RoomSchema = new Schema({
		players: Number,
		front: ObjectId,
		back: ObjectId,
		left: ObjectId,
		right: ObjectId,
		top: ObjectId,
		bottom: ObjectId
	});
	return RoomSchema;
};