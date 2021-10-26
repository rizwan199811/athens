var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var scheduleSchema = new Schema({
    dates: [{
        type: String
    }],
    approved: {
        type: Boolean,
        default: false
    },
    reason: String,
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);