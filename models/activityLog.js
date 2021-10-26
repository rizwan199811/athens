var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var activitySchema = new Schema({
    messageLogs:[{
        type:String
    }],
    timeStamp:String,
    performer:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
 }, { versionKey: false });

module.exports = mongoose.model('Activity', activitySchema);