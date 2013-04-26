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
	
	status: {
		active: { type: Boolean, default: false },
		deleted: { type: Boolean, default: false }
	},
		
	_creator: { type: ObjectId, ref: 'Member' },
	_deleter: { type: ObjectId, ref: 'Member' },
	
	admins: [{ type: ObjectId, ref: 'Member'}],

	notes: [String]

});

SchoolSchema.path('admins').index(true);
SchoolSchema.path('status.active').index(true);
SchoolSchema.path('status.deleted').index(true);




SchoolSchema.virtual('urlpath').get(function() {
	return '/' + this.webname;
});

SchoolSchema.virtual('settings_urlpath').get(function() {
	return '/schooladmin/' + this._id;
});

SchoolSchema.virtual('created').get(function() {
	return this._id.getTimestamp();
});

SchoolSchema.virtual('name_maxlength').get(function() {
	return 40;
});

SchoolSchema.virtual('webname_maxlength').get(function() {
	return 30;
});

SchoolSchema.virtual('summary_maxlength').get(function() {
	return 140;
});

module.exports = mongoose.model('School', SchoolSchema);
