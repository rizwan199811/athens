const UserModel = require('../models/user');
const JobModel = require('../models/job');
const asyncMiddleware = require('../utils/asyncMiddleware');
const status = require('../utils/statusCodes');
const jwt = require('../utils/jwt');
const mongoose = require('mongoose');
const express = require('express');

const router = express.Router();

const calculateYearMonth = (date) => {
    let month = date.substring(4, 7);
    let year = date.substring(11, 15);
    let yearMonth = month + "-" + year;

    return yearMonth
}

const actions = {
    /**  
    * @swagger
    {    
        "/mover": {
            "get": {
                "tags": [
                    "Mover"
                ],
                "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                    "description": "Get all movers",
                        "produces": [
                            "application/json"
                        ],
                            "responses": {
                    "200": {
                        "description": "Movers fetched successfully"
                    },
                    "400":{
                      "description": "No mover found"  
                    }
                }
            }
        },
     
    }*/
    getAllMovers: asyncMiddleware(async (req, res) => {
        let movers = await UserModel.find({ role: 'mover' }).populate('jobs');
        if (movers) {
            res.status(status.success.created).json({
                message: 'Movers fetched successfully',
                data: movers,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'No mover found',
                status: 400
            });
        }
    }),
    /**  
   * @swagger
   {    
       "/mover/{id}": {
           "put": {
               "tags": [
                   "Mover"
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
                       "parameters": [
                           {
                               "in": "path",
                               "name": "id",
                               "type": "string",
                               "description": "Mover ID"
                           },
                       ],
               "requestBody": {
                   "description": "Request Body",
                       "content": {
                       "application/json": {
                           "schema": {
                               "properties": {
                                   "weeklySchedule": {
                                       "type": "array",
                                       "items":{
                                           "type":"object",
                                           "properties": {
                                               "day":{
                                                  "type": "string",
                                                  "example":"Monday,Tuesday..."
   
                                               },
                                               "status":{
                                                   "type": "boolean",
                                                   "example": false
   
                                                }
                                           }
                                       }
                                   }
                               }
                           }
                       }
                   }
               },
           "responses": {
                   "200": {
                       "description": "Availability updated successfully"
                   },
                   "400":{
                     "description": "Something went wrong"  
                   }
               }
           }
       },
    
   }*/
    setAvailability: asyncMiddleware(async (req, res) => {
        let { weeklySchedule } = req.body
        var id = mongoose.Types.ObjectId(req.params.id);
        let assignee = await UserModel.findOneAndUpdate({ _id: id }, { weeklySchedule: weeklySchedule }, { new: true })
        if (assignee) {
            res.status(status.success.created).json({
                message: 'Availability updated successfully',
                data: assignee,
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
       "/mover/jobs": {
           "post": {
               "tags": [
                   "Mover"
               ],
               "security": [
                   {
                       "bearerAuth": []
                   }
               ],
                   "description": "Filter jobs",
                       "produces": [
                           "application/json"
                       ],
                       "requestBody": {
                           "description": "Request Body",
                               "content": {
                               "application/json": {
                                   "schema": {
                                   "properties": {
                                   "filters": {
                                   "type": "object",
                                   "properties": {
                                         "jobStatus":
                                         {
                                          "type": "string",
                                          "example":"pending"
                                          },
                                          "dates":
                                          {
                                          "type": "string",
                                          "example":"Thu Dec 03 2020"
                                          },
                                           "nearestDate":
                                          {
                                          "type": "string"
                                          },
                               }
                               },
                               "sort":{
                                     "type": "object",
                                     "properties": {
                                       "createdAt":
                                       {
                                        "type": "integer",
                                        "example":1
                                        }
                                       }
                                      }
                                      ,
                                      "page":{
                                          "type":"integer"
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
                     "description": "No mover found"  
                   }
               }
           }
       },
    
   }*/
    getAllJobsbyMover: asyncMiddleware(async (req, res) => {
        let { id } = req.decoded;
        let { filters: { jobStatus, dates, nearestDate }, sort, page } = req.body;
        let assignee = mongoose.Types.ObjectId(id);
        if (jobStatus || dates || nearestDate) {
            let jobs = await JobModel.paginate({
                assignee: { '$in': assignee },
                $or:
                    [
                        { status: jobStatus },
                        { 'dates': { $elemMatch: { date: dates } } },
                        { 'events.upcoming': { $gte: nearestDate } }]
            }, { page: page, populate: 'assignee' });
            if (jobs) {
                res.status(status.success.created).json({
                    message: 'Jobs fetched successfully',
                    data: jobs,
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'No mover found',
                    status: 400
                });
            }
        }
        else {
            let jobs = await JobModel.paginate({ assignee: { '$in': assignee }, status: { $ne: 'pending' } }, { page: page, sort: sort, populate: 'assignee' });
            if (jobs) {
                res.status(status.success.created).json({
                    message: 'Jobs fetched successfully',
                    data: jobs,
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'No mover found',
                    status: 400
                });
            }
        }
    }),

    /**  
    * @swagger
    {    
        "/mover/search": {
            "post": {
                "tags": [
                    "Mover"
                ],
                "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                    "description": "Get all movers on current date",
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
                                        "example":"Title of jobs"
                                    },
                                    "page": {
                                        "type": "integer"
                                    },
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
                      "description": "No mover found"  
                    }
                }
            }
        }
     
    }*/
    searchOnAllJobsbyMover: asyncMiddleware(async (req, res) => {
        let { id } = req.decoded;
        let { query, page } = req.body;
        let assignee = mongoose.Types.ObjectId(id);
        if (query) {
            var jobs = await JobModel.paginate({ assignee: { '$in': assignee }, status: { $ne: 'pending' }, title: { $regex: query, '$options': 'i' } }, { page: page, populate: 'assignee' });
        }
        else {
            jobs = await JobModel.paginate({ assignee: { '$in': assignee }, status: { $ne: 'pending' } }, { page: page, populate: 'assignee' });
        }
        if (jobs) {
            res.status(status.success.created).json({
                message: 'Jobs fetched successfully',
                data: jobs,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'No mover found',
                status: 400
            });
        }
    }),
}

//READ
router.get('/', jwt.verifyJwt, actions.getAllMovers); // + Used on Job Creation and Schedule => Mover


//UPDATE 
router.put('/:id', jwt.verifyJwt, actions.setAvailability)

// MOVER
router.post('/jobs', jwt.verifyJwt, actions.getAllJobsbyMover);
router.post('/search', jwt.verifyJwt, actions.searchOnAllJobsbyMover);

module.exports = router;
