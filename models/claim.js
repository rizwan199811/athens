var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;

var claimSchema = new Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  claimType: String,
  price: Number,
  description: String,
  title:String,
  waitTo:String,
  status: {
    type: String,
    default: 'open'
  },
  activities:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  updates: []
}, { versionKey: false, timestamps: true });
claimSchema.plugin(mongoosePaginate);
claimSchema.index({ title: 'text', status: 'text',waitTo:'text'});
module.exports = mongoose.model('Claim', claimSchema);