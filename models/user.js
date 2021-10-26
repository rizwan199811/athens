var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;

var userSchema = new Schema({
  name: String,
  phone: String,
  email: String,
  address: String,
  role: String,
  attribute: String,
  password: {
    type: String,
    select: false
  },
  jobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }]
  ,
  weeklySchedule: [{
    day: String,
    status: {
      type: Boolean,
      default: true
    }
  }],
  activeStatus: {
    type: Boolean,
    default: true
  },
  holidays: []
}, { versionKey: false, timestamps: true });
userSchema.plugin(mongoosePaginate);
userSchema.index({ name: 'text', address: 'text' });
module.exports = mongoose.model('User', userSchema);