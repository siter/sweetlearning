var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var SchoolSchema = new Schema({
	name: { type: String, trim: true, required: true },
	webname: { type: String, trim: true, required: true, lowercase: true, index: { unique: true, sparse: true } },
	
	summary: { type: String, trim: true },
	
	description: { type: String, trim: true },
	description_md: String,	
	
	location: String,
	www: String,
	phone: String,
	email: { type: String, lowercase: true},
	email_validated: { type: Boolean, default: false },
		
	_creator: { type: ObjectId, ref: 'Member' },
	admins: [{ type: ObjectId, ref: 'Member'}]
});

SchoolSchema.path('admins').index(true);


SchoolSchema.virtual('urlpath').get(function() {
	return '/' + this.webname;
});

SchoolSchema.virtual('settings_urlpath').get(function() {
	return '/settings/schools/edit/' + this.webname;
});

SchoolSchema.virtual('created').get(function() {
	return this._id.getTimestamp();
});

module.exports = mongoose.model('School', SchoolSchema);
