const UserModel = require('../models/user');
const CustomerModel = require('../models/customer');
const JobModel = require('../models/job');
const ScheduleModel = require('../models/schedule');
const ActivityModel = require('../models/activityLog');;
const asyncMiddleware = require('../utils/asyncMiddleware');
const status = require('../utils/statusCodes');
const jwt = require('../utils/jwt');
const ejs = require('ejs');
const express = require('express');
const router = express.Router();

const path = require('path');
const nodemailer = require("nodemailer");

let weekDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// const initializeSMTP = () => {
//     let smtpTransport = nodemailer.createTransport({
//         service: "Gmail",
//         port: 465,
//         auth: {
//             user: process.env.EMAIL,
//             pass: process.env.PASSWORD
//         }
//     });

//     return smtpTransport
// }

const initializeSMTP = () => {
    let smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        // port: 465,
        // auth: {
        //     user: authConfig.user,
        //     pass: authConfig.pass
        // }
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
            clientId: process.env.OAUTH_CLIENTID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN
        }
    });

    return smtpTransport
}

const mailOptionSetup = (email, subject, data) => {
    return {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        html: data,
        secure: true
    };
}
/** 
@swagger
{
    "components": {
        "schemas": {
            "Schedule": {
                "type": "object",
                    "required": [
                        "email"
                    ],
                        "properties": {
                    "reason": {
                        "type": "string"
                    },
                     "dates": {
                        "type": "array",
                        "items":{
                            "type":"object"
                    }
                    }
                }
            }
        }
    }
}
 */
const actions = {

    /**  
      * @swagger
      {    
       "/schedule": {
           "get": {
               "tags": [
                   "Schedule"
               ],"security": [
                    {
                        "bearerAuth": []
                    }
                ],
                   "description": "Get holiday requests",
                       "produces": [
                           "application/json"
                       ],
                       "parameters": [
                        {
                            "in": "path",
                            "name": "status",
                            "type": "string",
                            "description": "Holiday approval status"
                        },
                    ],
                           "responses": {
                   "200": {
                       "description": "Applicants fetched successfully"
                   },
                   "400":{
                     "description": "Something went wrong"  
                   }
               }
           },
           "post": {
               "tags": [
                   "Schedule"
               ],
               "security": [
                   {
                       "bearerAuth": []
                   }
               ],
                   "description": "Approval of requested holidays",
                       "produces": [
                           "application/json"
                       ],
               "requestBody": {
                   "description": "Request Body",
                       "content": {
                       "application/json": {
                           "schema": {
                               "$ref": "#/components/schemas/Schedule"
                                      }
                       }
                   }
               },
                               "responses": {
                   "200": {
                       "description": "Request submitted successfully"
                   },
                   "400":{
                     "description": "Something went wrong"  
                   }
               }
           },
           "put": {
               "tags": [
                   "Schedule"
               ],
               "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                   "description": "Approval of requested holidays",
                       "produces": [
                           "application/json"
                       ],
               "requestBody": {
                   "description": "Request Body",
                       "content": {
                       "application/json": {
                           "schema": {
                               "properties": {
                                   "id": {
                                       "type": "array",
                                       "items":{
                                           "type":"string",
                                           "example":"5faba2e7c455bb001725c86f"
                                       }
                                   }
                               }
                           }
                       }
                   }
               },
           "responses": {
                   "200": {
                       "description": "Holiday request approved successfully"
                   },
                   "400":{
                     "description": "No requests approved"  
                   }
               }
           }
       }
      }*/
    getRequestedHolidays: asyncMiddleware(async (req, res) => {
        let { status: scheduleStatus } = req.params;
        let applicants = await ScheduleModel.find({ approved: scheduleStatus }).populate('applicant');
        if (applicants) {
            res.status(status.success.created).json({
                message: 'Applicants fetched successfully',
                data: applicants,
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Something went wrong',
                status: 400
            });
        }
    }),
    requestHolidays: asyncMiddleware(async (req, res) => {
        let { id } = req.decoded;
        let assignee = await UserModel.findById(id).lean()
        if (assignee) {
            req.body.applicant = assignee._id;
            let newSchedule = new ScheduleModel({ ...req.body });
            let savedSchedule = await newSchedule.save();
            if (savedSchedule) {
                res.status(status.success.created).json({
                    message: 'Request submitted successfully.',
                    data: savedSchedule,
                    status: 200
                });
            } else {
                res.status(status.success.created).json({
                    message: 'Something went wrong',
                    status: 400
                });
            }
        } else {
            res.status(status.success.created).json({
                message: 'Something went wrong',
                status: 400
            });
        }
    }),
    approveHolidays: asyncMiddleware(async (req, res) => {
        let { id } = req.body;
        let approveHolidays = await ScheduleModel.updateMany({ _id: { '$in': id } }, { approved: true });
        let holidays = await ScheduleModel.find({ _id: { '$in': id } }).populate('applicant');
        let arr = [],
            dates;
        arr = holidays.map(x => {
            return {
                dates: x.dates,
                applicant: x.applicant
            }
        })
        let smtpTransport = initializeSMTP();
        for (let i = 0; i < arr.length; i++) {
            var user = await UserModel.findOneAndUpdate({ _id: arr[i].applicant }, { $push: { holidays: arr[i].dates } }, { new: true });
            dates = arr[i].dates.map(x => new Date(x).toDateString()).join(' , ');
            ejs.renderFile(path.join(__dirname, '../email-templates/holiday_approval.ejs'), { name: user.name, dates: dates }, async function (err, data) {
                if (err) {
                    res.status(status.success.created).json({
                        message: "Something went wrong",
                        err: err,
                        status: 400
                    });
                } else {
                    let mailOptions = mailOptionSetup(user.email, 'Request for Holidays Approved', data)
                    try {
                        await smtpTransport.sendMail(mailOptions);
                    } catch (e) {
                        res.status(status.success.created).json({
                            message: 'Something went wrong',
                            status: 400
                        });
                    }
                    if (approveHolidays && id.length > 0) {
                        res.status(status.success.created).json({
                            message: 'Holiday request approved successfully',
                            data: await ScheduleModel.find({ approved: false }).populate('applicant'),
                            status: 200
                        });
                    } else {
                        res.status(status.success.created).json({
                            message: 'No requests approved',
                            status: 400
                        });
                    }
                }
            })
        }
    }),

    /**  
      * @swagger
      {    
       "/schedule/current-jobs": {
           "post": {
               "tags": [
                   "Schedule"
               ],
               "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                   "description": "Get current date jobs",
                       "produces": [
                           "application/json"
                       ],
                           "requestBody": {
                   "description": "Request Body",
                       "content": {
                       "application/json": {
                           "schema": {
                               "properties": {
                                   "date": {
                                       "type": "string",
                                       "example":"Wed Nov 18 2020 14:00:00 GMT+0500 (Pakistan Standard Time)"
                                   }
                               }
                           }
                       }
                   }
               },
               "responses": {
                   "200": {
                       "description": "Jobs fetched successfully"
                   },
                   "400":{
                     "description": "Something went wrong"  
                   }
               }
           }
       },
       
      }*/
    getAllJobsOnDate: asyncMiddleware(async (req, res) => {
        let { date } = req.body;
        let currentdate = date.substring(0, 15);
        let job = await JobModel.find({ 'dates.date': currentdate, status: 'booked' }).sort({ startTime: 1 }).populate('assignee').populate('customer')

        if (job) {
            res.status(status.success.created).json({
                message: 'Jobs fetched successfully',
                data: job,
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Something went wrong',
                status: 400
            });
        }
    }),

    /**  
  * @swagger
  {    
   "/schedule/movers": {
       "post": {
           "tags": [
               "Schedule"
           ],
           "security": [
                    {
                        "bearerAuth": []
                    }
                ],
               "description": "Movers schedule",
                   "produces": [
                       "application/json"
                   ],
                       "requestBody": {
               "description": "Request Body",
                   "content": {
                   "application/json": {
                       "schema": {
                           "properties": {
                               "date": {
                                   "type": "string",
                                   "example":"Wed Nov 11 2020 13:00:00 GMT+0500 (PKT)"
                               }
                           }
                       }
                   }
               }
           },
           "responses": {
               "200": {
                   "description": "Movers schedule fetched successfully"
               },
               "400":{
                 "description": "Something went wrong"  
               }
           }
       }
   },
   
  }*/
    getAllJobsOnNextFiveDays: asyncMiddleware(async (req, res) => {
        let { date } = req.body;
        var dates = new Date(date);
        var n = dates.getDay();
        var moversSchedule = [];
        let users = await UserModel.find({ role: 'mover', activeStatus: true }).populate({
            path: 'jobs',
            populate: {
                path: 'assignee'
            }
        });
        for (let i = 0; i < users.length; i++) {
            let available = true;
            let holidayIndex = users[i].holidays.findIndex(x => x.substring(4, 15) == date.substring(4, 15))
            if (holidayIndex != -1) {
                available = false;
            }
            if (available) {
                let index = users[i].weeklySchedule.findIndex(x => x.day == weekDay[n])
                if (users[i].weeklySchedule[index].status == false) {
                    available = false;
                }
            }
            if (available) {
                let todayJobs = users[i].jobs.filter(x => x.dates.filter(y => y.date == date.substring(0, 15)).length > 0)
                let user = users[i].toObject()
                user.todayJobs = todayJobs.length;
                moversSchedule.push({
                    mover: user
                })
            }
        }
        res.status(status.success.created).json({
            message: 'Movers schedule fetched successfully',
            data: moversSchedule,
            status: 200
        });
    }),
}

//READ
router.get('/:status', jwt.verifyJwt, actions.getRequestedHolidays);

//ADD
router.post('/', jwt.verifyJwt, actions.requestHolidays);

//UPDATE 
router.put('/', jwt.verifyJwt, actions.approveHolidays);

//SCHEDULE 
router.post('/current-jobs', jwt.verifyJwt, actions.getAllJobsOnDate);
router.post('/movers', jwt.verifyJwt, actions.getAllJobsOnNextFiveDays);

module.exports = router;