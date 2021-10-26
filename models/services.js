var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var servicesSchema = new Schema({
  services:[{
      name:String
  }]
}, { versionKey: false });

module.exports = mongoose.model('Services', servicesSchema);
