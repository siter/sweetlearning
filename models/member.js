var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var MemberSchema = new Schema({
	name: {
		first: String,
		last: String
	},
	email: { type: String, required: true, lowercase: true, index: { unique: true, sparse: true } },
	facebook: {
		id: { type: String, lowercase: true, index: { unique: true, sparse: true } },
		profile: Schema.Types.Mixed
	},
	location: {
		text: String,
		suburb: String
	}
});

MemberSchema.virtual('name.display').get(function() {
	return this.name.first + ' ' + this.name.last;
});

MemberSchema.virtual('created').get(function() {
	return this._id.getTimestamp();
});


module.exports = mongoose.model('Member', MemberSchema);
