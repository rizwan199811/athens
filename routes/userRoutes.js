
const UserModel = require('../models/user');
const JobModel = require('../models/job');
const TokenModel = require('../models/token');
const ScheduleModel = require('../models/schedule');
const VerificationModel = require('../models/verification');
const asyncMiddleware = require('../utils/asyncMiddleware');
const ActivityModel = require('../models/activityLog');
const status = require('../utils/statusCodes');
const passwordUtils = require('../utils/passwordHash');
const jwt = require('../utils/jwt');
const ejs = require('ejs');
const jsonwebtoken = require('jsonwebtoken');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const path = require('path');
const nodemailer = require("nodemailer");

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
            "User": {
                "type": "object",
                    "required": [
                        "email"
                    ],
                        "properties": {
                    "name": {
                        "type": "string"
                    },
                     "phone": {
                        "type": "string",
                    },
                     "email": {
                        "type": "string",
                        "format":"email"
                    },
                     "address": {
                        "type": "string"
                    },
                     "role": {
                        "type": "string"
                    },
                     "attribute": {
                        "type": "string",
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
      "/user/login": {
          "post": {
              "tags": [
                  "Auth"
              ],
                  "description": "Login as user",
                      "produces": [
                          "application/json"
                      ],
                          "requestBody": {
                  "description": "Request Body",
                      "content": {
                      "application/json": {
                          "schema": {
                              "properties": {
                                  "email": {
                                      "type": "string"
                                  },
                                  "password": {
                                      "type": "string"
                                  }
                              }
                          }
                      }
                  }
              },
              "responses": {
                  "200": {
                      "description": "Logged in successfully"
                  },
                  "400":{
                    "description": "Wrong Password"  
                  }
              }
          }
      }
      
     }*/
    // Login User 
    login: asyncMiddleware(async (req, res) => {
        let { email, password } = req.body;
        let { EXPIRES_IN } = process.env;

        let user = await UserModel.findOne({ email: email }).select('+password');
        if (user) {
            if (user.activeStatus === true) {
                let verified = await passwordUtils.comparePassword(password, user.password);
                // comparing user password
                if (verified) {
                    let loggedUser = user.toObject();
                    delete loggedUser.password;
                    res.status(status.success.accepted).json({
                        message: 'Logged In Successfully',
                        data: loggedUser,
                        token: 'Bearer ' + await jwt.signJwt({ id: user.id }, EXPIRES_IN),
                        refreshToken: 'Bearer ' + await jwt.signJwt({ id: user.id }, "10d"),
                        status: 200
                    });
                } else {
                    res.status(status.success.created).json({
                        message: 'Wrong Password',
                        status: 400
                    });
                }
            } else {
                res.status(status.success.created).json({
                    message: "Your account is de-activated",
                    status: 400
                });
            }
        }
        else {
            res.status(status.success.created).json({
                message: "User not found",
                status: 400
            });
        }

    }),

    /**  
       * @swagger
       {    
        "/user": {
            "post": {
                "tags": [
                    "User"
                ],
                "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                    "description": "User registration",
                        "produces": [
                            "application/json"
                        ],
                            "requestBody": {
                    "description": "Request Body",
                        "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/User"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "User added successfully"
                    },
                    "400":{
                      "description": "Something went wrong"  
                    }
                }
            },
            "get": {
                "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                    "tags": [
                        "User"
                    ],
                        "description": "Get user by token",
                            "produces": [
                                "application/json"
                            ],
                                "responses": {
                    "200": {
                        "description": "User fetched successfully"
                    },
                    "400":{
                      "description": "User not found"  
                    }
                }
            },
            "put": {
                "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                    "tags": [
                        "Auth"
                    ],
                        "description": "Reset password",
                            "produces": [
                                "application/json"
                            ],
                                "requestBody": {
                    "description": "Request Body",
                        "content": {
                        "application/json": {
                            "schema": {
                                "properties": {
                                    "password": {
                                        "type": "string"
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Password reset successfully"
                    },
                    "400":{
                      "description": "User not found"  
                    }
                }
            },
            "delete": {
                "tags": [
                    "User"
                ],
                "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                    "description": "Delete user",
                        "produces": [
                            "application/json"
                        ],
                            "parameters": [
                                {
                                    "in": "query",
                                    "name": "id",
                                    "type": "string",
                                    "description": "User ID"
                                },
                                {
                                    "in": "query",
                                    "name": "page",
                                    "type": "integer",
                                    "description": "Page number"
                                }
                            ],
                                "responses": {
                    "200": {
                        "description": "User deleted successfully"
                    },
                    "400":{
                      "description": "User not found"  
                    }
                }
            }
        }, 
       }*/
    userRegistration: asyncMiddleware(async (req, res) => {
        let { email, role } = req.body;
        let user = await UserModel.findOne({ email: email });
        if (user) {
            res.status(status.success.accepted).json({
                message: 'Email already exists',
                status: 400
            });
        } else {
            let random = Math.random().toString(36).slice(2);
            req.body.password = await passwordUtils.hashPassword(random);
            if (role.toLowerCase() == 'mover') {
                let arr = [{ day: 'Monday' }, { day: 'Tuesday' }, { day: 'Wednesday' }, { day: 'Thursday' }, { day: 'Friday' }, { day: 'Saturday' }, { day: 'Sunday' }];
                req.body.weeklySchedule = arr;
                var newUser = new UserModel({ ...req.body });
            }
            else {
                var newUser = new UserModel({ ...req.body });
            }
            let savedUser = await newUser.save();
            if (savedUser) {
                let newuser = await UserModel.findOne({ email: email }).select('+password');
                let smtpTransport = initializeSMTP();
                ejs.renderFile(path.join(__dirname, '../email-templates/credentials.ejs'),
                    { name: newuser.name, email: newuser.email, password: random },
                    async function (err, data) {
                        if (err) {
                            res.status(status.success.created).json({
                                message: 'Something went wrong',
                                status: 400
                            });
                        } else {
                            let mailOptions = mailOptionSetup(newuser.email, 'Credentials For Athens Moving Experts', data)
                            try {
                                await smtpTransport.sendMail(mailOptions);
                                res.status(status.success.created).json({
                                    message: 'User added successfully',
                                    status: 200
                                });
                            }
                            catch (e) {
                                res.status(status.success.created).json({
                                    message: 'Something went wrong',
                                    status: 400
                                });
                            }

                        }
                    })
            }
            else {
                res.status(status.success.created).json({
                    message: 'Something went wrong',
                    status: 200
                });
            }

        }
    }),
    getUserById: asyncMiddleware(async (req, res) => {
        let { id } = req.decoded;
        id = mongoose.Types.ObjectId(id)
        let user = await UserModel.findOne({ _id: id }).populate('jobs');
        if (user) {
            res.status(status.success.created).json({
                message: 'User fetched successfully',
                data: user,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'User not found',
                status: 400
            });
        }
    }),
    resetPassword: asyncMiddleware(async (req, res) => {
        let { password } = req.body;
        let { id } = req.decoded;

        let user = await UserModel.findById(id);
        if (user) {
            password = await passwordUtils.hashPassword(password)
            let updatedUser = await UserModel.findOneAndUpdate({ _id: id }, { password: password }, { new: true })
            if (updatedUser) {
                res.status(status.success.created).json({
                    message: 'Password updated successfully',
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'User not found',
                    status: 400
                });
            }
        }
        else {
            res.status(status.success.created).json({
                message: 'User not found',
                status: 400
            });
        }
    }),
    deleteUser: asyncMiddleware(async (req, res) => {
        let { id, page } = req.query;
        let user = await UserModel.findByIdAndDelete(id);
        if (user) {
            await JobModel.deleteMany({ _id: { $in: user.jobs } });
            let applicants = await ScheduleModel.find({ applicant: user._id });
            let activities = await ActivityModel.find({ performer: user._id });
            for (let i = 0; i < applicants.length; i++) {
                await ScheduleModel.findByIdAndDelete({ _id: applicants[i]._id });
            }
            for (let i = 0; i < activities.length; i++) {
                await ActivityModel.findByIdAndDelete({ _id: activities[i]._id });
            }
            let remainingUsers = await UserModel.paginate({},
                { page: page, sort: { created: -1 } }
            )
            res.status(status.success.created).json({
                message: 'User deleted successfully',
                data: remainingUsers,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'User not found',
                status: 400
            });
        }
    }),


    /**  
      * @swagger
      {    
       "/user/{id}": {
           "get": {
               "tags": [
                   "User"
               ],
               "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                   "description": "Get user by id",
                       "produces": [
                           "application/json"
                       ],
                           "parameters": [
                               {
                                   "in": "path",
                                   "name": "id",
                                   "type": "string",
                                   "description": "User ID"
                               }
                           ],
                               "responses": {
                   "200": {
                       "description": "User fetched successfully"
                   },
                   "400":{
                     "description": "User not found"  
                   }
               }
           },
           "put": {
               "tags": [
                   "User"
               ],
               "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                   "description": "Update user",
                       "produces": [
                           "application/json"
                       ],
                           "parameters": [
                               {
                                   "in": "path",
                                   "name": "id",
                                   "type": "string",
                                   "description": "User ID"
                               }
                           ],
                               "requestBody": {
                   "description": "Request Body",
                       "content": {
                       "application/json": {
                           "schema": {
                               "$ref": "#/components/schemas/User"
                           }
                       }
                   }
               },
               "responses": {
                   "200": {
                       "description": "Profile updated successfully"
                   },
                   "400":{
                     "description": "Email already exist"  
                   }
               }
           }
       },
       
      }*/
    getUser: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let user = await UserModel.findById({ _id: id }).populate('jobs').select('+password');
        if (user) {
            res.status(status.success.created).json({
                message: 'User fetched successfully',
                data: user,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'User not found',
                status: 400
            });
        }
    }),
    editUser: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let { email } = req.body;
        let user = await UserModel.find({ email: email });
        if (user.length <= 1) {
            let updatedUser = await UserModel.findOneAndUpdate({ _id: id }, { ...req.body }, { new: true });
            if (updatedUser) {
                res.status(status.success.created).json({
                    message: 'Profile updated successfully',
                    status: 200,
                    data: updatedUser
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'Something went wrong',
                    status: 400
                });
            }
        }
        else {
            res.status(status.success.created).json({
                message: 'Email already exist',
                status: 400
            });
        }
    }),

    /**  
  * @swagger
  {    
   "/user/all": {
       "post": {
           "tags": [
               "User"
           ],
           "security": [
                    {
                        "bearerAuth": []
                    }
                ],
               "description": "Get all users",
                   "produces": [
                       "application/json"
                   ],
                       "requestBody": {
               "description": "Request Body",
                   "content": {
                   "application/json": {
                       "schema": {
                           "properties": {
                               "query": {
                                   "type": "string",
                                   "example":"Name or Address"
                               },
                               "filter": {
                                   "type": "object",
                                       "properties": {
                                       "type": {
                                           "type": "string",
                                           "example":"Role of user"
                                       }
                                   }
                               },
                               "page": {
                                   "type": "integer"
                               }
                           }
                       }
                   }
               }
           },
           "responses": {
               "200": {
                   "description": "Users fetched successfully"
               },
               "400":{
                 "description": "Something went wrong"  
               }
           }
       }
   }
   
  }*/
    getAllUsers: asyncMiddleware(async (req, res) => {
        let { query, filter } = req.body;
        let users = await UserModel.paginate(
            {
                "$and": [
                    {
                        "$or": [{ name: { "$regex": query, '$options': 'i' } }, { address: { "$regex": query, '$options': 'i' } },
                        {
                            'attribute': {
                                "$regex": query, '$options': 'i'
                            }
                        }]
                    }, { role: { "$regex": filter.type, '$options': 'i' } }
                ]

            }, {
            page: req.body.page
        }
        )
        if (users) {
            res.status(status.success.created).json({
                message: 'Users fetched successfully',
                data: users,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Something went wrong',
                status: 400
            });
        }
    }),

    /**  
  * @swagger
  {    
   "/user/forgot-password": {
       "post": {
           "tags": [
               "Auth"
           ],
               "description": "Forget password",
                   "produces": [
                       "application/json"
                   ],
                       "requestBody": {
               "description": "Request Body",
                   "content": {
                   "application/json": {
                       "schema": {
                           "properties": {
                               "email": {
                                   "type": "string"
                               }
                           }
                       }
                   }
               }
           },
           "responses": {
               "200": {
                   "description": "Check your mail"
               },
               "400":{
                 "description": "Something went wrong"  
               }
           }
       }
   },
   
  }*/
    forgotPassword: asyncMiddleware(async (req, res) => {
        let { email } = req.body;
        let user = await UserModel.findOne({ email: email });

        var val = Math.floor(1000 + Math.random() * 9000);
        if (user) {
            let smtpTransport = initializeSMTP();
            let verifyCode = await VerificationModel.find({ email: email });
            if (verifyCode.length > 0) {
                let updatedCode = await VerificationModel.findOneAndUpdate({ email: email }, { code: val }, { new: true });
                ejs.renderFile(path.join(__dirname, '../email-templates/reset-password.ejs'), { code: updatedCode.code, email: updatedCode.email, name: user.name }, async function (err, data) {
                    if (err) {
                        res.status(status.success.created).json({
                            message: 'Something went wrong',
                            status: 400
                        });
                    } else {
                        let mailOptions = mailOptionSetup(updatedCode.email, 'Reset Password', data)
                        try {
                            await smtpTransport.sendMail(mailOptions);
                            res.status(status.success.created).json({
                                message: 'Please check your mail',
                                token: 'Bearer ' + await jwt.signJwt({ email: updatedCode.email }),
                                status: 200
                            });
                        }
                        catch (e) {
                            res.status(status.success.created).json({
                                message: 'Something went wrong',
                                status: 400
                            });
                        }

                    }
                })
            }
            else {
                req.body.code = val;
                let newVerfication = new VerificationModel({ ...req.body });
                var savedVerfication = await newVerfication.save();
                if (savedVerfication) {

                    ejs.renderFile(path.join(__dirname, '../email-templates/reset-password.ejs'), { code: savedVerfication.code, email: savedVerfication.email, name: user.name }, async function (err, data) {
                        if (err) {
                            res.status(status.success.created).json({
                                message: 'Something went wrong',
                                status: 400
                            });
                        } else {
                            let mailOptions = mailOptionSetup(savedVerfication.email, 'Reset Password', data)
                            try {
                                await smtpTransport.sendMail(mailOptions);
                                res.status(status.success.created).json({
                                    message: 'Please check your mail',
                                    token: 'Bearer ' + await jwt.signJwt({ email: savedVerfication.email }),
                                    status: 200
                                });
                            }
                            catch (e) {
                                res.status(status.success.created).json({
                                    message: 'Something went wrong',
                                    status: 400
                                });
                            }

                        }
                    })
                }
                else {
                    res.status(status.success.created).json({
                        message: 'Something went wrong',
                        status: 400
                    });
                }
            }
        }
        else {
            res.status(status.success.created).json({
                message: 'Invalid email',
                status: 400
            });
        }
    }),

    /**  
   * @swagger
   {    
    "/user/verify": {
        "post": {
                "tags": [
                    "Auth"
                ],
                    "description": "Verify code",
                        "produces": [
                            "application/json"
                        ],
                            "requestBody": {
                "description": "Request Body",
                    "content": {
                    "application/json": {
                        "schema": {
                            "properties": {
                                "code": {
                                    "type": "integer"
                                }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Check your mail"
                },
                "400":{
                  "description": "Enter valid code"  
                }
            }
        }
    }
    
   }*/
    codeVerification: asyncMiddleware(async (req, res) => {
        let { code } = req.body;
        let { email } = req.decoded;
        let user = await UserModel.findOne({ email: email })
        let verifyCode = await VerificationModel.findOne({ email: email });
        let loggedUser = user.toObject();
        delete loggedUser.password;
        if (verifyCode && user) {
            if (verifyCode.code == code) {
                await VerificationModel.findOneAndDelete({ email: email });
                res.status(status.success.created).json({
                    message: 'Code verified successfully',
                    data: loggedUser,
                    token: 'Bearer ' + await jwt.signJwt({ id: user.id }),
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'Enter valid code',
                    status: 400
                });
            }
        }
        else {
            res.status(status.success.created).json({
                message: 'Enter valid code',
                status: 400
            });
        }
    }),

    generateAccessToken: asyncMiddleware(async (req, res, next) => {
        let refreshToken = req.get('authorization');
        let { SECRET_KEY, EXPIRES_IN } = process.env;
        let { id } = req.decoded;
        if (id) {
            let token = await TokenModel.findOne({ token: refreshToken });
            if (token) {
                token = refreshToken.slice(7, refreshToken.length);
                jsonwebtoken.verify(token, SECRET_KEY, async (err, decoded) => {
                    if (decoded) {
                        res.status(status.success.created).json({
                            token: 'Bearer ' + await jwt.signJwt({ id: id }, EXPIRES_IN),
                            status: 200
                        });
                    } else {
                        res.status(status.client.unAuthorized).json({
                            message: 'Token is not valid',
                            status: 401
                        });
                    }

                })

            }
        }
    }),

}


//READ
router.get('/', jwt.verifyJwt, actions.getUserById);
router.get('/:id', jwt.verifyJwt, actions.getUser);

//ADD
router.post('/', jwt.verifyJwt, actions.userRegistration);
router.post('/token', jwt.verifyJwt, actions.generateAccessToken);

//UPDATE 
router.put('/', jwt.verifyJwt, actions.resetPassword)
router.put('/:id', jwt.verifyJwt, actions.editUser);

//DELETE
router.delete('/', jwt.verifyJwt, actions.deleteUser);

// LOGIN / REGISTER
router.post('/login', actions.login)
router.post('/forgot-password', actions.forgotPassword)
router.post('/verify', actions.codeVerification)

// USER & ACCOUNT  get-all-jobs-by-filter
router.post('/all', jwt.verifyJwt, actions.getAllUsers);

module.exports = router;