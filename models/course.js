var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var CourseSchema = new Schema({
	name: { type: String, trim: true, required: true },
	webname: { type: String, trim: true, required: true, lowercase: true, index: { unique: true, sparse: true } },
		
	description: { type: String, trim: true },
	description_md: String,	
			
	_creator: { type: ObjectId, ref: 'Member' },
});

CourseSchema.virtual('created').get(function() {
	return this._id.getTimestamp();
});

module.exports = mongoose.model('Course', CourseSchema);
