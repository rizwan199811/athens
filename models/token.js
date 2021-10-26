var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tokenSchema = new Schema({
  token:String
}, { versionKey: false });

module.exports = mongoose.model('token', tokenSchema);
