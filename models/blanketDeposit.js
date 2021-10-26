var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');

var blanketDepositSchema = new Schema({
  quantity: Number,
  edit: {
    type: Boolean,
    default: true
  },
  cost: Number,
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  activities:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  
}, { versionKey: false,timestamps:true });
blanketDepositSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('BlanketDeposit', blanketDepositSchema);