const ServicesModel = require('./models/services');
const UserModel = require('./models/user')
const mongoose = require('mongoose');

const passwordUtils = require('./utils/passwordHash');

require('dotenv').config();
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
servicesOptions = [
  { name: "Packaging" },
  { name: "Loading" },
  { name: "Unloading" },
  { name: "Grand Piano" },
  { name: "Baby" },
  { name: "Hot Tub" },
];
db.once('open', async function () {
  console.log('Database is connected!'); 
  // Insert All The Dropdowns With Basic Options
  try {
    let services = await ServicesModel.find()
    if (services.length < 1) {
      let newService = new ServicesModel({ services: [...servicesOptions] });
      await newService.save();
      let user = new UserModel({
        name: 'John Doe',
        phone: '+1 0328 32932 23',
        email: 'admin@gmail.com',
        address: 'Raleigh nc',
        role: 'admin',
        password: await passwordUtils.hashPassword('admin')
      })
      await user.save();
    }
  } catch (e) {
    console.log(e)
  }
  mongoose.disconnect();
});