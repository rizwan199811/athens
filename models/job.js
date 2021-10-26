var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
const autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var jobSchema = new Schema({
  title: String,
  description: String,
  services: [Object],
  dates: [Object],
  startTime: String,
  meetTime: String,
  locations: [Object],
  events:{
  upcoming:Date,
  last:Date
  },
  plainTitle: String,
  status: String,
  startYearMonth:[String],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  note: [{
    text: {
      type: String
    },
    jobId:Number
  }],
  assigneeRequired:Number,
  assignee: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  propertyType:String,
  price:String,
  trucks: [Object],
  jobType:String
}, { versionKey: false, timestamps: true });

autoIncrement.initialize(mongoose.connection);
jobSchema.plugin(autoIncrement.plugin, {
  model: 'Job',
  field: 'jobId',
  startAt: 1,
  incrementBy: 1
}); 
jobSchema.plugin(mongoosePaginate);
jobSchema.index({ startDate: 'text', endDate: 'text', title: 'text', services: 'text' });
module.exports = mongoose.model('Job', jobSchema);