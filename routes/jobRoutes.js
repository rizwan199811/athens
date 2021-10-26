const UserModel = require('../models/user');
const CustomerModel = require('../models/customer');
const JobModel = require('../models/job');
const ClaimModel = require('../models/claim');
const BlanketDepositModel = require('../models/blanketDeposit');
const ActivityModel = require('../models/activityLog');
const asyncMiddleware = require('../utils/asyncMiddleware');
const status = require('../utils/statusCodes');
const mongoose = require('mongoose');
const express = require('express');
const stripe = require('stripe')('sk_test_51HfgSrIoqQ2sulu0SLUA2H8Ll1FRtG6kNsZpKq7XtIGyMs7oT8r5KVNGdBJYuzMAFwkKn6gMhPLALxeUO4NvE1Gh00v28RQnIv');
const jwt = require('../utils/jwt');
const jsondiffpatch = require('jsondiffpatch').create();
const router = express.Router();

const calculateYearMonthArr = (dates) => {
    let month = [],
        year = [],
        yearMonth = [];
    for (var i = 0; i < dates.length; i++) {
        month[i] = dates[i].substring(4, 7);
        year[i] = dates[i].substring(11, 15);
        yearMonth[i] = month[i] + "-" + year[i];
    }
    return yearMonth
}

const calculateYearMonth = (date) => {
    let month = date.substring(4, 7);
    let year = date.substring(11, 15);
    let yearMonth = month + "-" + year;

    return yearMonth
}

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

const getSortedDate = (dates) => {
    let latestJobs = [...dates.sort(function (a, b) {
        return new Date(a) - new Date(b);
    })];
    let lastJobs = [...dates.sort(function (a, b) {
        return new Date(b) - new Date(a);
    })]
    return {
        latestJobs,
        lastJobs
    }
}

const filterAssigneeId = (jobById, assigneesId) => {
    let oldAssigneeId = jobById.assignee;
    let newAssigneeId = assigneesId ? assigneesId : [];
    let distinctOldAssigneeId = oldAssigneeId.filter(function (obj) {
        return newAssigneeId.indexOf(obj.toString()) == -1;
    });
    let newlyAdded = newAssigneeId.filter(function (obj) {
        let id = mongoose.Types.ObjectId(obj);
        return oldAssigneeId.indexOf(id) == -1;
    });
    return {
        distinctOldAssigneeId,
        newlyAdded
    }

}

const generateTitle = (customer, startTime, assigneeRequired, locations, propertyType, services, status) => {
    if (status === 'booked') {
        let city1 = ''
        let city2 = ''
        if (locations[0]) {
            let length = locations[0].value.split(',').length
            city1 = locations[0].value.split(',')[length - 3]
        }
        if (locations.length > 1) {
            let length = locations[locations.length - 1].value.split(',').length
            city2 = locations[locations.length - 1].value.split(',')[length - 3]
        }
        let arr = services ? services.map((x) => { return x.name }) : '';
        let string = arr ? arr.join(" ") : '';
        let title = customer.firstName + ' ' + customer.lastName + ' ' + (startTime ? formatAMPM(new Date(startTime)) + ' ' : '')
            + (assigneeRequired ? assigneeRequired + ' man' : '') + ' ' + (city1 ? city1 : '') + ' '
            + (city2 ? ('to ' + city2) : '') + ' '
            + (propertyType ? propertyType : '') + ' ' + string;
        return title
    }
    else {
        let city1 = ''
        let city2 = ''
        if (locations[0]) {
            let length = locations[0].value.split(',').length
            city1 = locations[0].value.split(',')[length - 3]
        }
        if (locations.length > 1) {
            let length = locations[locations.length - 1].value.split(',').length
            city2 = locations[locations.length - 1].value.split(',')[length - 3]
        }
        let arr = services ? services.map((x) => { return x.name }) : '';
        let string = arr ? arr.join(" ") : '';
        let title = customer.firstName + ' ' + customer.lastName + ' '
            + (assigneeRequired ? assigneeRequired + ' man' : '') + ' ' + (city1 ? city1 : '') + ' '
            + (city2 ? ('to ' + city2) : '') + ' '
            + (propertyType ? propertyType : '') + ' ' + string;
        return title
    }
}

/** 
@swagger
{
    "components": {
        "schemas": {
            "Job": {
                "type": "object",
                    "required": [
                        "email"
                    ],
                        "properties": {
                    "description": {
                        "type": "string"
                    },
                    "services": {
                        "type": "array",
                            "items": {
                            "type": "object"
                        }
                    },
                    "dates": {
                        "type": "array",
                            "items": {
                            "type": "object",
                                "properties": {
                                "date": {
                                    "type": "string"
                                },
                                "time":{
                                    "type":"string"
                                }
                            }
                        }
                    },
                    "startTime": {
                        "type": "string"
                    },
                    "meetTime": {
                        "type": "string"
                    },
                    "propertyType": {
                        "type": "string"
                    },
                    "price": {
                        "type": "string"
                    },
                    "trucks": {
                        "type": "object",
                        "properties":{
                            "type":{
                              "type":"string"
                            },
                            "number":{
                                "type":"string"
                            }
                        }
                    },
                    "locations": {
                        "type": "array",
                            "items": {
                            "type": "object",
                                "properties": {
                                "type": {
                                    "type": "string"
                                },
                                "value": {
                                    "type": "string",
                           },
                                "default": {
                                    "type": "boolean"
                                }
                            }
                        }
                    },
                    "note": {
                        "type": "array",
                            "items": {
                            "type": "object",
                                "properties": {
                                "text": {
                                    "type": "string"
                                }
                            }
                        }
                    },
                    "status": {
                        "type": "string",
                            "example": "pending"
                    },
                    "assigneeRequired": {
                        "type": "integer"
                    },
                    "jobType": {
                        "type": "string"
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
    "/job": {
        "post": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Create Job",
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
                                "$ref": "#/components/schemas/Job"
                            },
                            {
                                "type": "object",
                                "properties": {
                                    "assigneesId": {
                                        "type": "array",
                                        "items":{
                                            "type":"string",
                                            "example":"5fe048af024d8406e4a3d881"
                                        }
                                    },
                                    "customerId": {
                                        "type": "string",
                                        "format":"email",
                                    },
                                    "userId": {
                                        "type": "string",
                                        "example":"5fccb068c4c8e100177f06e8"
                                    },
                                   
                                }
                            }
                        ]
                        },
                       
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Job added successfully"
                },
                "400":{
                  "description": "Job not found"  
                }
                
            }
        },
        "delete": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Delete Job",
                    "produces": [
                        "application/json"
                    ],
                      "parameters": [
                            {
                                "in": "query",
                                "name": "id",
                                "schema": {
                                    "type": "string",
                                },
                                "description": "Job ID"
                            },
                            {
                                "in": "query",
                                "name": "page",
                                "schema": {
                                    "type": "integer"
                                },
                                "description": "Page number"
                            }
                        ],
            "responses": {
                "200": {
                    "description": "Job deleted sucessfully"
                },
                "400": {
                    "description": "Job not found"
                }
            }
        }
    }
    
   }*/
    createJob: asyncMiddleware(async (req, res) => {
        let { dates, customerId: email, assigneesId, assigneeRequired, locations, propertyType, startTime, userId, services } = req.body;
        let customer = await CustomerModel.findOne({ email: email })
        let mappedDates = dates.map(x => {
            return x.date
        })
        let yearMonth = calculateYearMonthArr(mappedDates); // Calculate year and month of each date
        let sortedDates = getSortedDate(mappedDates); // Get sorted dates
        let latestJob = sortedDates.latestJobs; // Get sorted dates in ascending order
        let lastJob = sortedDates.lastJobs; // Get sorted dates in descending order 
        req.body.events = {
            upcoming: latestJob[0],
            last: lastJob[0]
        }
        req.body.startYearMonth = yearMonth;
        if (customer) {
            const date = new Date(Date.now());
            let obj = {
                performer: userId,
                messageLogs: "Job creation activity is performed",
                timeStamp: date.toUTCString()
            }
            // Save new job creation activity
            let newActivity = new ActivityModel({ ...obj });
            let savedActivity = await newActivity.save();
            req.body.activities = savedActivity._id;
            let title = generateTitle(customer, dates[0].time, assigneeRequired, locations, propertyType, services, 'pending')
            req.body.title = title
            req.body.plainTitle = title ? title.toLowerCase() : '';
            req.body.customer = customer._id;
            if (req.body.assignee != []) {
                req.body.assignee = req.body.assigneesId;
            }
            let newJob = new JobModel({ ...req.body });
            let savedJob = await newJob.save();

            if (savedJob && customer) {
                // Update movers 
                await UserModel.updateMany({ _id: { "$in": assigneesId } }, { '$push': { jobs: savedJob._id } }, { new: true });

                //Update  Customer
                await CustomerModel.findOneAndUpdate({ email: email }, { $push: { 'jobs': savedJob._id } }, { new: true });
                res.status(status.success.created).json({
                    message: 'Job added successfully',
                    data: savedJob,
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
    deleteJob: asyncMiddleware(async (req, res) => {
        let { id, page } = req.query;
        let job = await JobModel.findByIdAndDelete(id);
        if (job) {
            await ActivityModel.deleteMany({ _id: { $in: job.activities } });
            let remainingJobs = await JobModel.paginate({}, {
                page: page,
                populate: 'assignee customer',
                lean: true,
                sort: {
                    createdAt: -1
                }
            });

            let claims = await ClaimModel.find({ job: job._id });
            await ClaimModel.deleteMany({ _id: { $in: claims } })
            for (let i = 0; i < claims.length; i++) {
                await ActivityModel.deleteMany({ _id: { $in: claims[i].activities } });
            }

            let blanketDeposit = await BlanketDepositModel.find({ job: job._id });
            await BlanketDepositModel.deleteMany({ _id: { $in: blanketDeposit } })
            for (let i = 0; i < blanketDeposit.length; i++) {
                await ActivityModel.deleteMany({ _id: { $in: blanketDeposit[i].activities } });
            }

            let customer = job.customer;
            await CustomerModel.findOneAndUpdate({ _id: customer }, { $pull: { jobs: { $in: id } } }, { new: true });
            res.status(status.success.created).json({
                message: 'Job deleted successfully',
                data: remainingJobs,
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Job not found',
                status: 400
            });
        }
    }),

    /**  
    * @swagger
{
    "/job/{id}": {
        "get": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Get job",
                    "produces": [
                        "application/json"
                    ],
                        "parameters": [
                            {
                                "in": "path",
                                "name": "id",
                                "type": "string",
                                "description": "Job ID"

                            },

                        ],
                            "responses": {
                "200": {
                    "description": "Job fetched successfully"
                },
                "400": {
                    "description": "Job not found"
                }
            }
        },
        "put": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Update job",
                    "produces": [
                        "application/json"
                    ],
                        "parameters": [
                            {
                                "in": "path",
                                "name": "id",
                                "type": "string",
                                "description": "Job ID"

                            },

                        ],
                            "requestBody": {
                "description": "Request Body",
                    "content": {
                    "application/json": {
                        "schema": {
                            "allOf": [
                                {
                                    "$ref": "#/components/schemas/Job"
                                },
                                {
                                    "type": "object",
                                    "properties": {
                                        "assigneesId": {
                                            "type": "array",
                                            "items": {
                                                "type": "string",
                                                "example": "5fe048af024d8406e4a3d881"
                                            }
                                        },
                                        "customerId": {
                                            "type": "string",
                                            "format": "email",
                                        },
                                        "userId": {
                                            "type": "string",
                                            "example": "5fccb068c4c8e100177f06e8"
                                        },

                                    }
                                }
                            ]
                        },
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Job updated successfully"
                },
                "400": {
                    "description": "Something went wrong"
                }
            }
        }

    },

}*/
    // Get particular job data
    getJob: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let job = await JobModel.findById({ _id: id }).populate('assignee').populate('customer').populate({
            path: 'activities',
            populate: {
                path: 'performer'
            }
        })
        if (job) {
            res.status(status.success.created).json({
                message: 'Job fetched successfully',
                data: job,
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Job not found',
                status: 400
            });
        }
    }),
    // Update job details
    editJob: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let { dates, assigneesId, userId, assigneeRequired, locations, propertyType, startTime, customerId: email, services } = req.body;
        let jobById = await JobModel.findById({ _id: id })
        if (jobById) {
            let mappedDates = dates.map(x => {
                return x.date
            })
            req.body.startYearMonth = calculateYearMonthArr(mappedDates);
            let sortedDates = getSortedDate(mappedDates); // Get sorted dates
            let latestJob = sortedDates.latestJobs; // Get sorted dates in ascending order
            let lastJob = sortedDates.lastJobs; // Get sorted dates in descending order 
            req.body.events = {
                upcoming: latestJob[0],
                last: lastJob[0]
            }
            let assigneeId = filterAssigneeId(jobById, assigneesId);
            let distinctOldAssigneeId = assigneeId.distinctOldAssigneeId;
            let newlyAdded = assigneeId.newlyAdded;
            let jobCustomer = await CustomerModel.findOne({ email: email })

            if (jobCustomer) {
                var user = await UserModel.findById({ _id: userId })
                req.body.customer = jobCustomer._id;
                req.body.assignee = assigneesId ? assigneesId : [];
                // let title = jobCustomer.firstName + ' ' + jobCustomer.lastName + ' '
                //     + formatAMPM(new Date(startTime)) + ' ' + (assigneeRequired ? assigneeRequired : '') + ' '
                //     + (locations[0] ? locations[0].value : '') + ' ' + (locations[locations.length - 1] ? 'to '
                //         + locations[locations.length - 1].value : '') + ' ' + (propertyType ? propertyType : '');
                let title = generateTitle(jobCustomer, dates[0].time, assigneeRequired, locations, propertyType, services, jobById.status)
                req.body.plainTitle = title ? title.toLowerCase() : '';
                if (distinctOldAssigneeId.length > 0) {
                    await UserModel.updateMany({ _id: distinctOldAssigneeId }, { $pull: { jobs: jobById._id } })
                }
                if (newlyAdded.length > 0) {
                    await UserModel.updateMany({ _id: newlyAdded }, { $push: { jobs: jobById._id } });
                }
                if (req.body._id) {
                    delete req.body._id
                }
                req.body.title = title;
                let job = await JobModel.findOneAndUpdate({ _id: id }, { ...req.body }, { new: true });
                var role = user.role;
                let capitalrole = function capitalizeFirstLetter(role) {
                    return role.charAt(0).toUpperCase() + role.slice(1);
                }
                if (job) {
                    const diff = jsondiffpatch.diff(jobById.toObject(), job.toObject());
                    let message = [];
                    for (var propName in diff) {
                        if (['title', 'startTime', 'meetTime', 'status', 'assigneeRequired', 'jobType', 'propertyType', 'price']
                            .includes(propName)) {
                            let diffString = diff[propName].toString()
                            var splitString = diffString.split(",");
                            if (splitString[1] != undefined || splitString[1] != '') {
                                if (propName == 'startTime') {
                                    propName = 'start time'
                                }
                                if (propName == 'meetTime') {
                                    propName = 'meet time'
                                }
                                if (propName == 'jobType') {
                                    propName = 'job type'
                                }
                                if (propName == 'assigneeRequired') {
                                    propName = 'number of required assignees'
                                }
                                if (propName == 'propertyType') {
                                    propName = 'property type'
                                }
                                message[propName] = capitalrole(role) + " changes " + propName + " from " + splitString[0] + " to " + splitString[1];
                            }
                        } else {
                            if (propName != 'updatedAt' && propName != 'plainTitle' && propName != 'jobId' && propName != 'startYearMonth' && propName != 'activities') {
                                message[propName] = capitalrole(role) + " changes " + propName;
                            }

                        }

                    }
                    const date = new Date(Date.now());
                    let obj = {
                        performer: userId,
                        messageLogs: Object.values(message),
                        timeStamp: date.toUTCString()
                    }
                    if (obj.messageLogs == '') {
                        obj.messageLogs = 'No updates have been done in this activity'
                    }

                    let newActivity = new ActivityModel({ ...obj });
                    let savedActivity = await newActivity.save();
                    let activities = job.activities;
                    activities.unshift(savedActivity)
                    req.body.activities = activities;
                    await JobModel.findByIdAndUpdate(id, { ...req.body }, { new: true })
                    res.status(status.success.created).json({
                        message: 'Job updated successfully',
                        status: 200,
                        data: job
                    });
                }
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

    /**  
   * @swagger
   {    
    "/job/all": {
        "post": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Fetch all jobs",
                    "produces": [
                        "application/json"
                    ],
                        "requestBody": {
                "description": "Request Body",
                    "content": {
                    "application/json": {
                        "schema": {
                            "properties": {
                                "sort": {
                                    "type": "object",
                                        "properties": {
                                        "assigneeRequired":
                                        {
                                            "type": "integer"
                                        },
                                        "plainTitle":
                                        {
                                            "type": "integer"
                                        },
                                        "createdAt":
                                        {
                                            "type": "integer"
                                        }
                                    }
                                },
                                "query": {
                                    "type": "string",
                                    "example":"Title or Services-name"
                                },
                                "page": {
                                    "type": "integer",
                                  }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "All Jobs fetched successfully"
                },
                "400":{
                  "description": "Something went wrong"  
                }
            }
        },
    },
    
   }*/
    getAllJobs: asyncMiddleware(async (req, res) => {
        let { query, sort, page } = req.body;
        var re = new RegExp(query, 'i');
        for (var propName in sort) {
            if (sort[propName] === null || sort[propName] === undefined || sort[propName] == '') {
                delete sort[propName]; // Filter sort object 
            }
        }
        let jobs = await JobModel.paginate({
            "$or": [{ title: { '$regex': re } }, { 'services.name': { '$regex': re } }]
        }, { page: page, sort: sort, populate: 'assignee customer', lean: true })
        if (jobs) {
            res.status(status.success.created).json({
                message: 'All Jobs fetched successfully',
                data: jobs,
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
    "/job/filter": {
        "post": {
            "tags": [
                "Job"
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
                                        "dates":
                                        {
                                            "type": "string",
                                            "example":"Tue, 19 Jan 2021 08:46:32 GMT"
                                        },
                                        "nearestDate":
                                        {
                                            "type": "string"
                                        },
                                        "sortLast":
                                        {
                                            "type": "integer"
                                        },
                                        "status":
                                        {
                                            "type": "string",
                                            "example":"pending"
                                        }
                                    }
                                },
                                "page":{
                                    "type": "integer" 
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
    getAllJobsByFilter: asyncMiddleware(async (req, res) => {
        let { filters: { dates, nearestDate, sortLast }, page } = req.body;
        let jobs = await JobModel.paginate({
            $or: [{ 'dates': { '$elemMatch': { date: dates.substring(0, 15) } } }, { 'events.upcoming': { $gte: nearestDate } }, { status: req.body.filters.status }]
        }, { page: page, populate: 'assignee customer' })

        if (sortLast) {
            jobs.docs.sort((a, b) => {
                return new Date(b.events.upcoming) - new Date(a.events.upcoming);
            })
            if (jobs) {
                res.status(status.success.created).json({
                    message: 'Jobs fetched successfully',
                    data: jobs,
                    status: 200
                });
            } else {
                res.status(status.success.created).json({
                    message: 'Something went wrong ',
                    status: 400
                });
            }
        } else {
            if (jobs) {
                res.status(status.success.created).json({
                    message: 'Jobs fetched successfully',
                    data: jobs,
                    status: 200
                });
            } else {
                res.status(status.success.created).json({
                    message: 'Something went wrong ',
                    status: 400
                });
            }
        }
    }),
    /**  
   * @swagger
   {    
    "/job/status/{id}": {
        "put": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
            "parameters": [
                {
                    "in": "path",
                    "name": "id",
                    "type": "string",
                    "description": "Job ID"
 
                },
 
            ],
                "description": "Update Job Status",
                    "produces": [
                        "application/json"
                    ],
                        "requestBody": {
                "description": "Request Body",
                    "content": {
                    "application/json": {
                        "schema": {
                            "properties": {
                                "status": {
                                    "type": "string",
                                    "example":"pending"
                                },
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "All Jobs fetched successfully"
                },
                "400":{
                  "description": "Something went wrong"  
                }
            }
        },
    },
    
   }*/
    editJobStatus: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let updatedJob = await JobModel.findOneAndUpdate({ _id: id }, { status: req.body.status }, { new: true });;
        if (updatedJob) {
            res.status(status.success.created).json({
                message: 'Job updated successfully',
                data: await JobModel.find({}).populate('assignee'),
                status: 200
            });
        } else {
            res.status(status.success.created).json({
                message: 'Job not found',
                status: 400
            });
        }
    }),

    /**  
   * @swagger
   {    
    "/job/monthly-jobs": {
        "post": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Fetch monthly jobs",
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
                                },
                                "id":{
                                    "type": "string",
                                    "example":"600dd5c3605f660023b612bf"
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
        },
    },
    
   }*/
    getAllJobOnDate: asyncMiddleware(async (req, res) => {
        let { id, date } = req.body;
        let yearMonth = calculateYearMonth(date);
        let jobs = [];
        if (id) {
            jobs = await JobModel.find({ assignee: { $in: id }, startYearMonth: { $in: yearMonth }, status: 'booked' }).lean().populate('customer').populate('assignee');
        } else {
            jobs = await JobModel.find({ startYearMonth: { $in: yearMonth }, status: 'booked' }).lean().populate('customer').populate('assignee')
        }
        if (jobs) {
            res.status(status.success.created).json({
                message: 'Jobs fetched successfully',
                data: jobs,
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
    "/job/book": {
        "post": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Confirm job booking",
                    "produces": [
                        "application/json"
                    ],
                        "requestBody": {
                "description": "Request Body",
                    "content": {
                    "application/json": {
                        "schema": {
                            "properties": {
                                "dates": {
                                    "type": "array",
                                        "items": {
                                        "type": "object",
                                        properties": {
                                "date": {
                                    "type":"string"
                                },
                                "time":{
                                     "type":"string"
                                }
                            }
                                    }
                                },
                                "startTime": {
                                    "type": "string"
                                },
                                "meetTime": {
                                    "type": "string"
                                },
                                "phone": {
                                    "type": "string"
                                },
                                "locations": {
                                    "type": "array",
                                        "items": {
                                        "type": "object",
                                            "properties": {
                                            "from": {
                                                "type": "string"
                                            },
                                            "to": {
                                                "type": "string"
                                            }
                                        }
                                    }
                                },
                                "stripeToken": {
                                    "type": "string",
                                    "example":"tok_1Hh8GDIoqQ2sulu0tM0AjAlo"
                                },
                                "jobId": {
                                    "type": "string",
                                    "example":"5f95d4f6bb911e00175c34cd"
                                },
                                "email": {
                                    "type": "string",
                                    "format":"email"
                                },
                                "customerId": {
                                    "type": "string",
                                    "example":"5f95d4f6bb911e00175c34cd"
                                },
                                "amount": {
                                    "type": "integer"
                                }
 
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Job booked successfully"
                },
                "400":{
                  "description": "Job not found"  
                }
            }
        },
    },
    
   }*/
    confirmBooking: asyncMiddleware(async (req, res) => {
        let { stripeToken, amount, jobToUpdate, dates, paidInCash, email, locations, startTime } = req.body;
        if (!paidInCash) {
            amount = parseInt(amount) * 100;
            stripe.charges.create({
                amount: amount,
                currency: 'usd',
                source: stripeToken,
                capture: false, // note that capture: false
            })
                .then(async (charge) => {
                    let charged = await stripe.charges.capture(charge.id)
                    let jobById = await JobModel.findById({ _id: jobToUpdate })
                    if (jobById) {
                        let mappedDates = dates.map(x => {
                            return x.date
                        })
                        req.body.startYearMonth = calculateYearMonthArr(mappedDates);
                    }
                    req.body.status = 'booked'
                    let job = await JobModel.findOneAndUpdate({ _id: jobToUpdate }, { ...req.body }, { new: true }).populate('customer').populate('assignee').populate({
                        path: 'activities',
                        populate: {
                            path: 'performer'
                        }
                    })
                    let customer = await CustomerModel.findByIdAndUpdate({ _id: req.body.customerId }, { ...req.body }, { new: true })

                    if (job && customer) {
                        const diff = jsondiffpatch.diff(jobById.toObject(), job.toObject());

                        let message = [];
                        for (var propName in diff) {
                            if (propName != 'updatedAt' && propName != 'assignee' && propName != 'services' && propName != 'note' && propName != 'locations' && propName != 'dates' && propName != 'startYearMonth') {
                                let diffString = diff[propName].toString()
                                var splitString = diffString.split(",");
                                if (propName == 'startTime') {
                                    propName = 'start time'
                                }
                                if (propName == 'meetTime') {
                                    propName = 'meet time'
                                }
                                message[propName] = "Customer changes " + propName + " from " + splitString[0] + " to " + splitString[1] + " in booking of this job";
                            } else {

                                if (['services', 'locations', 'dates', 'assignee'].includes(propName)) {
                                    if (propName == 'locations') {
                                        propName = 'location'
                                    }
                                    if (propName == 'dates') {
                                        propName = 'date'
                                    }
                                    if (propName == 'services') {
                                        propName = 'service'
                                    }
                                    message[propName] = "Customer changes " + propName;

                                } else {
                                    if (propName == 'updatedAt') {
                                        delete message[propName]
                                    }
                                }

                            }
                        }
                        req.body.messageLogs = Object.values(message);
                        if (req.body.messageLogs == '') {
                            req.body.messageLogs = 'No updates have been done in this activity'
                        }
                        req.body.performer = req.body.userId;
                        const date = new Date(Date.now());
                        req.body.timeStamp = date.toUTCString();
                        let newActivity = new ActivityModel({ ...req.body });
                        await newActivity.save();

                        res.status(status.success.created).json({
                            message: 'Job booked successfully',
                            status: 200,
                            data: job
                        });
                    } else {
                        res.status(status.success.created).json({
                            message: 'Job not found',
                            status: 400
                        });
                    }

                })

        } else {
            let jobById = await JobModel.findById({ _id: jobToUpdate })
            let customer = await CustomerModel.findByIdAndUpdate({ _id: req.body.customerId }, { ...req.body }, { new: true })
            if (jobById) {
                let mappedDates = dates.map(x => {
                    return x.date
                })
                req.body.startYearMonth = calculateYearMonthArr(mappedDates);
                req.body.status = 'booked'
                let { assigneeRequired, propertyType, services } = jobById;
                let title = generateTitle(customer, dates[0].time, assigneeRequired, locations, propertyType, services, 'booked')
                req.body.title = title
                req.body.plainTitle = title.toLowerCase();
            }

            let job = await JobModel.findOneAndUpdate({ _id: jobToUpdate }, { ...req.body }, { new: true }).populate('customer').populate('assignee').populate({
                path: 'activities',
                populate: {
                    path: 'performer'
                }
            })

            if (job && customer) {
                const diff = jsondiffpatch.diff(jobById.toObject(), job.toObject());

                let message = [];
                for (var propName in diff) {
                    if (propName != 'updatedAt' && propName != 'assignee' && propName != 'services' && propName != 'note' && propName != 'locations' && propName != 'dates' && propName != 'startYearMonth') {
                        let diffString = diff[propName].toString()
                        var splitString = diffString.split(",");
                        if (propName == 'startTime') {
                            propName = 'start time'
                        }
                        if (propName == 'meetTime') {
                            propName = 'meet time'
                        }
                        message[propName] = "Customer changes " + propName + " from " + splitString[0] + " to " + splitString[1] + " in booking of this job";
                    } else {
                        if (propName == 'services' || propName == 'locations' || propName == 'assignee' || propName == 'dates') {
                            message[propName] = "Customer changes " + propName;
                        } else {
                            if (propName == 'updatedAt') {
                                delete message[propName]
                            }
                        }

                    }
                }
                req.body.messageLogs = Object.values(message);
                if (req.body.messageLogs == '') {
                    req.body.messageLogs = 'No updates have been done in this activity'
                }
                req.body.performer = req.body.userId;
                const date = new Date(Date.now());
                req.body.timeStamp = date.toUTCString();
                let newActivity = new ActivityModel({ ...req.body });
                await newActivity.save();

                res.status(status.success.created).json({
                    message: 'Job booked successfully',
                    status: 200,
                    data: job
                });
            } else {
                res.status(status.success.created).json({
                    message: 'Job or customer not found',
                    status: 400
                });
            }
        }
    }),

    /**  
   * @swagger
   {    
    "/job/payment": {
        "post": {
            "tags": [
                "Job"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Decide payment method",
                    "produces": [
                        "application/json"
                    ],
                        "requestBody": {
                "description": "Request Body",
                    "content": {
                    "application/json": {
                        "schema": {
                            "properties": {
                                "stripeToken": {
                                    "type": "string",
                                    "example":"tok_1Hh8GDIoqQ2sulu0tM0AjAlo"
                                },
                                "amount": {
                                    "type": "integer"
                                },
                                "jobId": {
                                    "type": "integer"
                                }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Payment has been received"
                },
                "400":{
                  "description": "Transaction failed"  
                }
            }
        },
    },
    
   }*/
    payment: asyncMiddleware(async (req, res) => {
        let { stripeToken, amount, jobId } = req.body;
        stripe.charges.create({
            amount: amount,
            currency: 'usd',
            source: stripeToken,
            capture: false, // note that capture: false
        })
            .then(async (charge) => {
                await stripe.charges.capture(charge.id)
                await JobModel.findByIdAndUpdate({ _id: jobId }, { status: 'Paid Online' })
                res.status(status.success.created).json({
                    message: 'Payment has been received.',
                    status: 200
                });
            })
            .catch((err) => {
                res.status(status.success.created).json({
                    message: 'Transaction failed',
                    error: err,
                    status: 400
                }); // If some error occurs 
            });
    }),
}

//READ
router.get('/:id', jwt.verifyJwt, actions.getJob);

//ADD
router.post('/', jwt.verifyJwt, actions.createJob)

//UPDATE
router.put('/:id', jwt.verifyJwt, actions.editJob);
router.put('/status/:id', jwt.verifyJwt, actions.editJobStatus);

//DELETE
router.delete('/', jwt.verifyJwt, actions.deleteJob);

// JOBS
router.post('/all', jwt.verifyJwt, actions.getAllJobs);
router.post('/filter', jwt.verifyJwt, actions.getAllJobsByFilter);
// + Used on Job Details on Mover => Job Details
router.post('/book', jwt.verifyJwt, actions.confirmBooking);
router.post('/payment', jwt.verifyJwt, actions.payment)

// CALENDAR
router.post('/monthly-jobs', jwt.verifyJwt, actions.getAllJobOnDate);

//GENERAL


module.exports = router;