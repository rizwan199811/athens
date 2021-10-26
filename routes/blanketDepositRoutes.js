const UserModel = require('../models/user');
const CustomerModel = require('../models/customer');
const JobModel = require('../models/job');
const BlanketDepositModel = require('../models/blanketDeposit');
const ActivityModel = require('../models/activityLog');
const asyncMiddleware = require('../utils/asyncMiddleware');
const status = require('../utils/statusCodes');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('../utils/jwt');
const blanketDeposit = require('../models/blanketDeposit');
const { query } = require('winston');
const jsondiffpatch = require('jsondiffpatch').create();
const router = express.Router();

/** 
@swagger
{
    "components": {
        "schemas": {
            "Deposit": {
                "type": "object",
                    "required": [
                        "quantity"
                    ],
                    "properties": {
                    "quantity": {
                        "type": "integer"
                    },
                     "cost": {
                        "type": "integer"
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
   "/deposit": {
       "post": {
           "tags": [
               "Deposit"
           ],
           "security": [
                    {
                        "bearerAuth": []
                    }
                ],
               "description": "Add blanket deposit",
                   "produces": [
                       "application/json"
                   ],
           "requestBody": {
               "description": "Request Body",
                   "content": {
                   "application/json": {
                       "schema": {
                             "allOf": [
                           {
                               "$ref": "#/components/schemas/Deposit"
                           },
                           {
                               "type": "object",
                               "properties": {
                               "jobId": {
                                       "type": "integer",
                                   }
                               }
                           }
                       ]
                   }
                   }
               }
           },
                           "responses": {
               "200": {
                   "description": "Blanket deposit added successfully"
               },
               "400":{
                 "description": "Something went wrong"  
               }
           }
       },
       "put": {
           "tags": [
               "Deposit"
           ],
           "security": [
                    {
                        "bearerAuth": []
                    }
                ],
               "description": "Update blanket deposit",
                   "produces": [
                       "application/json"
                   ],
           "requestBody": {
               "description": "Request Body",
                   "content": {
                   "application/json": {
                       "schema": {
                           "allOf": [
                           {
                               "$ref": "#/components/schemas/Deposit"
                           },
                           {
                               "type": "object",
                               "properties": {
                               "id": {
                                       "type": "string",
                                       "example":"5fcccc2056bad3002391288f"
                                   },
                                  "userId": {
                                       "type": "string",
                                   }, 
                               }
                           }
                       ]
                       }
                   }
               }
           },
       "responses": {
               "200": {
                   "description": "Blanket deposit updated successfully"
               },
               "400":{
                 "description": "Something went wrong"  
               }
           }
       },
    "delete": {
           "tags": [
               "Deposit"
           ],
           "security": [
                    {
                        "bearerAuth": []
                    }
                ],
           "parameters": [
                 {
                  "in": "query",
                  "name": "id",
                  "schema": {
                        "type": "string",
                            },
                  "description": "Deposit ID"
                  },
                  {
                  "in": "query",
                  "name": "page",
                  "schema": {
                        "type": "integer",
                            },
                  "description": "Page number"
                  },
               ],
               "description": "Delete blanket deposit",
                   "produces": [
                       "application/json"
                   ],
           "responses": {
               "200": {
                   "description": "Blanket deposit deleted successfully"
               },
               "400":{
                 "description": "Blanket deposit not found"  
               }
           }
       }
   }
  }*/
    addBlanketDeposit: asyncMiddleware(async (req, res) => {
        let { jobId } = req.body;
        let { id } = req.decoded;
        let job = await JobModel.findOne({ jobId: jobId });
        if (job) {
            req.body.customer = job.customer;
            req.body.job = job._id;
            let newBlanketDeposit = new BlanketDepositModel({ ...req.body });
            var savedBlanketDeposit = await newBlanketDeposit.save()
            let customer = mongoose.Types.ObjectId(job.customer);

            var updatedCustomer = await CustomerModel.findOneAndUpdate({ _id: customer },
                { $push: { blanketDeposit: savedBlanketDeposit._id } }, { new: true });
            if (updatedCustomer && savedBlanketDeposit) {
                const date = new Date(Date.now());
                let obj = {
                    performer: id,
                    messageLogs: "Blanket deposit creation activity is performed",
                    timeStamp: date.toUTCString()
                }
                let newActivity = new ActivityModel({ ...obj });
                let savedActivity = await newActivity.save();
                req.body.activities = savedActivity._id;
                await BlanketDepositModel.findByIdAndUpdate({ _id: savedBlanketDeposit._id },
                    { ...req.body }, { new: true });
                res.status(status.success.created).json({
                    message: 'Blanket deposit added successfully',
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
                message: 'Please enter valid job',
                status: 200
            });
        }

    }),
    editBlanketDeposit: asyncMiddleware(async (req, res) => {
        let { quantity, cost, id, page } = req.body;
        let { id: userId } = req.decoded;
        let blanketDeposit = await BlanketDepositModel.findById({ _id: id });
        let activities = blanketDeposit.activities;
        let user = await UserModel.findById({ _id: userId });
        let updateBlanket = {
            quantity: quantity,
            cost: cost
        }
        if (blanketDeposit && updateBlanket) {
            const diff = jsondiffpatch.diff(blanketDeposit.toObject(), updateBlanket);
            let message = [];

            for (var propName in diff) {
                let diffString = diff[propName].toString()
                var splitString = diffString.split(",");
                if (['quantity'].includes(propName)) {

                    if (splitString[1] != undefined || splitString[1] != '') {
                        if (updateBlanket.quantity - blanketDeposit.quantity > 0) {
                            message[propName] = "Customer keeps " + Math.abs(updateBlanket.quantity - blanketDeposit.quantity) + " more blanket(s).";
                        }
                        else {
                            message[propName] = "Customer returns " + Math.abs(updateBlanket.quantity - blanketDeposit.quantity) + " blanket(s)."
                        }
                    }
                }
                else {
                    if (['cost'].includes(propName)) {
                        message[propName] = "Updates" + propName + " from " + splitString[0] + " to " + splitString[1];
                    }
                }
            }
            let date = new Date(Date.now());
            let obj = {
                performer: userId,
                messageLogs: Object.values(message),
                timeStamp: date.toUTCString()
            }
            if (obj.messageLogs == '') {
                obj.messageLogs = user.name + " updates nothing.";
            }
            var activity = new ActivityModel({ ...obj });
            let savedActivity = await activity.save();

            activities.unshift(savedActivity)
            req.body.activities = activities;
        }
        let updatedblanketDeposit = await BlanketDepositModel.findOneAndUpdate({ _id: id }, { ...req.body }, { new: true }).populate(['customer',
            {
                path: 'activities',
                populate: {
                    path: 'performer',
                    select: { 'name': 1 }
                }
            }, {
                path: 'job'
            }
        ])
        if (updatedblanketDeposit && activity && user) {
            res.status(status.success.created).json({
                message: 'Blanket deposit updated successfully',
                data: updatedblanketDeposit,
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Something went wrong',
                status: 400
            });
        }
    }),
    deleteBlanketDeposit: asyncMiddleware(async (req, res) => {
        let { id, page } = req.query;
        let blanketDeposit = await BlanketDepositModel.findByIdAndDelete(id);
        if (blanketDeposit) {
            let remainingDeposits = await BlanketDepositModel.paginate({}, {
                populate: ['customer',
                    {
                        path: 'activities',
                        populate: {
                            path: 'performer',
                            select: { 'name': 1 }
                        }
                    }, {
                        path: 'job',
                        select: { 'jobId': 1 },
                    }
                ],
                page: page,
                sort: { createdAt: -1 }
            })
            res.status(status.success.created).json({
                message: 'Blanket deposit deleted successfully',
                data: remainingDeposits,
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Blanket deposit not found',
                status: 400
            });
        }
    }),

    /**  
      * @swagger
      {    
       "/deposit/all": {
           "post": {
               "tags": [
                   "Deposit"
               ],
               "security": [
                        {
                            "bearerAuth": []
                        }
                    ],
                   "description": "Get all blanket deposits",
                       "produces": [
                           "application/json"
                       ],
                "requestBody": {
                   "description": "Request Body",
                       "content": {
                       "application/json": {
                           "schema": {
                               "properties": {
                                   "page": {
                                       "type": "integer"
                                   },
                                   "query":{
                                       "type": "string"
                                   }
                               }
                           }
                       }
                   }
               },
               "responses": {
                   "200": {
                       "description": "Blanket deposits fetched successfully"
                   },
                   "400":{
                     "description": "Something went wrong"  
                   }
               }
           }
       },
       
      }*/
    getAllBlanketDeposit: asyncMiddleware(async (req, res) => {
        let { page, query } = req.body;
        if (query) {
            let deposits = await CustomerModel.paginate({
                $and: [{ "blanketDeposit.0": { "$exists": true } }, {
                    $or: [
                        { firstName: { $regex: query, '$options': 'i' } }
                        , { lastName: { $regex: query, '$options': 'i' } },
                        { email: { $regex: query, '$options': 'i' } }]
                }],
            }, {
                populate: [{
                    path: 'blanketDeposit',
                    populate: {
                        path: 'customer job activities',
                    },
                },
                {
                    path: 'activities',
                    populate: {
                        path: 'performer',
                        select: { 'name': 1 }
                    }
                }
                    , {
                    path: 'job',
                    select: { 'jobId': 1 },
                }
                ],
                page: 1,
                sort: { createdAt: -1 }
            })
            deposits.docs = deposits.docs.map((doc) => { return doc.blanketDeposit });
            deposits.docs = deposits.docs[0]
            if (deposits.docs) {
                if (deposits.docs.length > 0) {
                    res.status(status.success.created).json({
                        message: 'Blanket deposits fetched successfully',
                        data: deposits,
                        status: 200
                    });
                } else {
                    res.status(status.success.created).json({
                        message: 'Blanket deposit not found',
                        status: 400
                    });
                }
            }
            else {
                res.status(status.success.created).json({
                    message: 'Blanket deposit not found',
                    status: 400
                });
            }
        }
        else {
            let blanketDeposit = await BlanketDepositModel.paginate({}, {
                populate: ['customer',
                    {
                        path: 'activities',
                        populate: {
                            path: 'performer',
                            select: { 'name': 1 }
                        }
                    }, {
                        path: 'job',
                        select: { 'jobId': 1 },
                    }
                ],
                page: page,
                sort: { createdAt: -1 }
            })
            if (blanketDeposit) {
                res.status(status.success.created).json({
                    message: 'Blanket deposits fetched successfully',
                    data: blanketDeposit,
                    status: 200
                });
            } else {
                res.status(status.success.created).json({
                    message: 'Something went wrong',
                    status: 400
                });
            }
        }
    }),

    getBlanketDeposit: asyncMiddleware(async (req, res) => {
        let id = req.params.id;
        let deposit = await BlanketDepositModel.findById(id).populate(['customer',
            {
                path: 'activities',
                populate: {
                    path: 'performer',
                    select: { 'name': 1 }
                }
            }, {
                path: 'job'
            }
        ])
        if (deposit) {
            res.status(status.success.created).json({
                message: 'Blanket deposit fetched successfully',
                data: deposit,
                status: 200
            });
        }
    }),

    /**  
      * @swagger
      {    
       "/deposit": {
           "delete": {
               "tags": [
                   "Deposit"
               ],
               "security": [
                        {
                            "bearerAuth": []
                        }
                    ],  
                "parameters": [
                    {
                        "in": "query",
                        "name": "page",
                        "type": "number",
                        "description": "Page number"
                    },
                    {
                        "in": "query",
                        "name": "id",
                        "type": "string",
                        "description": "Object ID of Deposit"
                    },
    
                ],
                   "description": "Delete blanket deposit",
                       "produces": [
                           "application/json"
                       ],
               "responses": {
                   "200": {
                       "description": "Blanket deposits fetched successfully"
                   },
                   "400":{
                     "description": "Something went wrong"  
                   }
               }
           }
       },
       
      }*/
    deleteBlanketDeposit: asyncMiddleware(async (req, res) => {
        let { id, page } = req.query;
        let blanketDeposit = await BlanketDepositModel.findByIdAndDelete(id);
        await CustomerModel.updateMany({ _id: { $in: blanketDeposit.customer } },
            { $pull: { blanketDeposit: { $in: blanketDeposit._id } } }, { new: true });
        await ActivityModel.deleteMany({ _id: { $in: blanketDeposit.activities } });

        if (blanketDeposit) {
            let remainingDeposits = await BlanketDepositModel.paginate({}, {
                populate: ['customer',
                    {
                        path: 'activities',
                        populate: {
                            path: 'performer',
                            select: { 'name': 1 }
                        }
                    }, {
                        path: 'job',
                        select: { 'jobId': 1 },
                    }
                ],
                page: page,
                sort: { createdAt: -1 }
            })

            res.status(status.success.created).json({
                message: 'Blanket deposit deleted successfully',
                data: remainingDeposits,
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Blanket deposit not found',
                status: 400
            });
        }
    }),

}

//BLANKETS

//READ
router.post('/all', jwt.verifyJwt, actions.getAllBlanketDeposit)
router.get('/:id', jwt.verifyJwt, actions.getBlanketDeposit)


//ADD
router.post('/', jwt.verifyJwt, actions.addBlanketDeposit)

//UPDATE
router.put('/', jwt.verifyJwt, actions.editBlanketDeposit)

//DELETE
router.delete('/', jwt.verifyJwt, actions.deleteBlanketDeposit)


module.exports = router;