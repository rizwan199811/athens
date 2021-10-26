var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var verificationSchema = new Schema({
    email:String,
    code:Number
 }, { versionKey: false });

module.exports = mongoose.model('Verification', verificationSchema);