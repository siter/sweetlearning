var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var CourseSchema = new Schema({
	name: { type: String, trim: true, required: true },
	webname: { type: String, trim: true, required: true, lowercase: true, index: { unique: true, sparse: true } },
		
	description: { type: String, trim: true },
	description_md: String,	
			
	school: { type: ObjectId, ref: 'School'},

	status: {
		active: { type: Boolean, default: false },
		deleted: { type: Boolean, default: false }
	},
		
	_creator: { type: ObjectId, ref: 'Member' },
	_deleter: { type: ObjectId, ref: 'Member' },
	
	_created: { type : Date, default: Date.now },
	_updated: { type : Date, default: Date.now },
	
	notes: [String]
	
});

CourseSchema.virtual('created').get(function() {
	return this._created;
});

CourseSchema.virtual('settings_urlpath').get(function() {
	return '/courseadmin/' + this._id;
});

CourseSchema.virtual('urlpath').get(function() {
	return '/course/' + this._id;
});

//////
module.exports = mongoose.model('Course', CourseSchema);

