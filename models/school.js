var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

var TextSection = new Schema({
	title: { type: String, required: true},
	text: { type: String, required: true}
});

var WebLink = new Schema({
	url: {type: String, required: true},
	title: String
});

var School = new Schema({
	name: { type: String, trim: true },
	webname: { type: String, required: true, lowercase: true, index: { unique: true, sparse: true } },
	quickintro: String,
	description: String,
	summary: String,
	contact: {
		www: String,
		phone: String,
		email: { type: String, lowercase: true, index: { unique: true, sparse: true } }
	},
	location: {
		street: String,
		suburb: String,
		postcode: String,
		state: String,
		country: {type: String, default: "Australia"}
	},
	text_sections: [TextSection],
	links: [WebLink],
	managers: [ObjectId],
	created: { type: Date, default: Date.now },
	lastupdate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('School', School);
