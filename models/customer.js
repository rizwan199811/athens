var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;

var customerSchema = new Schema({
    firstName: String,
    lastName:String,
    phone: String,
    email: String,
    subContacts: [Object],
    plainName: String
    ,
    claim: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim'
    }],
    plainPhone:String,
    blanketDeposit: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlanketDeposit'
    }],
    jobs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    }]
}, { versionKey: false, timestamps: true });
customerSchema.plugin(mongoosePaginate);
customerSchema.index({ name: 'plainName', email: 'text' });
module.exports = mongoose.model('Customer', customerSchema);