var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var MemberSchema = new Schema({
	name: {
		first: String,
		last: String
	},
	
	phone: String,
	email: String,
	location: String,
	website: String,
	
	bio: String,
	
	facebook: {
		id: { type: String, lowercase: true, index: { unique: true, sparse: true } },
		token: {
			access: String,
			refresh: String
		},
		profile: Schema.Types.Mixed
	},
});

MemberSchema.virtual('name.display').get(function() {
	return this.name.first + ' ' + this.name.last;
});

MemberSchema.virtual('created').get(function() {
	return this._id.getTimestamp();
});


module.exports = mongoose.model('Member', MemberSchema);
