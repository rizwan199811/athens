const CustomerModel = require('../models/customer');
const JobModel = require('../models/job');
const ClaimModel = require('../models/claim');
const UserModel = require('../models/user');
const ActivityModel = require('../models/activityLog');
const asyncMiddleware = require('../utils/asyncMiddleware');
const status = require('../utils/statusCodes');
const express = require('express');
const jwt = require('../utils/jwt');
const jsondiffpatch = require('jsondiffpatch').create();
const router = express.Router();


/** 
@swagger
{
    "components": {
        "schemas": {
            "Claim": {
                "type": "object",
                    "required": [
                        "email"
                    ],
                        "properties": {
                    "claimType": {
                        "type": "string"
                    },
                     "price": {
                        "type": "integer"
                    },
                     "description": {
                        "type": "string"
                    },
                     "title": {
                        "type": "string"
                    },
                    "waitTo": {
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
        "/claim": {
            "post": {
                "tags": [
                    "Claim"
                ],
                "security": [
                        {
                            "bearerAuth": []
                        }
                    ],
                    "description": "Add claim",
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
                                        "$ref": "#/components/schemas/Claim"
                                    },
                                    {
                                        "type": "object",
                                        "properties": {
                                            "jobId": {
                                                "type": "integer"
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
                        "description": "Claim added successfully"
                    },
                    "400": {
                        "description": "Something went wrong"
                    }
                }
            },
            "delete": {
                "tags": [
                    "Claim"
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
                            "type": "string",
                            "description": "Claim ID"
                        },
                        {
                            "in": "query",
                            "name": "page",
                            "type": "integer",
                            "description": "Page number"
                        }
                    ],
                        "description": "Delete claim",
                            "produces": [
                                "application/json"
                            ],
            "responses": {
                    "200": {
                        "description": "Claim deleted successfully"
                    },
                    "400": {
                        "description": "Claim not found"
                    }
                }
            }
        },
    
    }*/
    addClaim: asyncMiddleware(async (req, res) => {
        // Save new claim to dmong
        let { jobId } = req.body;
        let { id } = req.decoded;
        let job = await JobModel.findOne({ jobId: jobId });
        if (job) {
            req.body.customer = job.customer;
            req.body.job = job._id;
            let newClaim = new ClaimModel({ ...req.body });
            var savedClaim = await newClaim.save()
            var updatedCustomer = await CustomerModel.findOneAndUpdate({ _id: job.customer },
                { $push: { claim: savedClaim._id } }, { new: true });
            if (updatedCustomer && savedClaim) {
                const date = new Date(Date.now());
                let obj = {
                    performer: id,
                    messageLogs: "Claim creation activity is performed",
                    timeStamp: date.toUTCString()
                }
                let newActivity = new ActivityModel({ ...obj });
                let savedActivity = await newActivity.save();
                req.body.activities = savedActivity._id;
                await ClaimModel.findByIdAndUpdate({ _id: savedClaim._id },
                    { ...req.body }, { new: true });

                res.status(status.success.created).json({
                    message: 'Claim added successfully',
                    data: savedClaim._id,
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'Something went wrong',
                    status: 200
                });
            }
        }
        else {
            res.status(status.success.created).json({
                message: 'Please enter valid job',
                status: 400
            });
        }


    }),
    deleteClaim: asyncMiddleware(async (req, res) => {
        let { id, page } = req.query;
        let claim = await ClaimModel.findByIdAndDelete(id);
        if (claim) {
            await CustomerModel.updateMany({ _id: { $in: claim.customer } },
                { $pull: { claim: { $in: claim._id } } }, { new: true });
            await ActivityModel.deleteMany({ _id: { $in: claim.activities } });
            let remainingClaims = await ClaimModel.paginate({}, { page: page, populate: 'customer job', sort: { createdAt: -1 } });

            res.status(status.success.created).json({
                message: 'Claim deleted successfully',
                data: remainingClaims,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Claim not found',
                status: 400
            });
        }
    }),
    /**  
  * @swagger
{
    "/claim": {
        "get": {
            "tags": [
                "Claim"
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
                        "type": "string",
                        "description": "Claim ID"
                    }
                ],
                    "description": "Get claim by ID",
                        "produces": [
                            "application/json"
                        ],
                            "responses": {
                "200": {
                    "description": "Claim fetched successfully"
                },
                "400": {
                    "description": "Claim not found"
                }
            }
        },
       
        "put": {
            "tags": [
                "Claim"
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
                        "description": "Claim ID"
                    }
                ],
                    "description": "Update claim",
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
                                    "$ref": "#/components/schemas/Claim"
                                },
                                {
                                    "type": "object",
                                    "properties": {
                                        "status": {
                                            "type": "string",
                                            "example": "closed"
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
                    "description": "Claim updated successfully"
                },
                "400": {
                    "description": "Claim not found"
                }
            }
        }
    },

}*/
    getClaimbyID: asyncMiddleware(async (req, res) => {
        let { id } = req.query;
        let claim = await ClaimModel.findById(id).populate({
            path: 'job', populate: {
                path: 'assignee'
            }
        }).populate('customer');
        if (claim) {
            res.status(status.success.created).json({
                message: 'Claim fetched successfully',
                data: claim,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Claim not found',
                status: 400
            });
        }
    }),
    editClaim: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let { id: userId } = req.decoded;
        let { status: claimStatus } = req.body;
        let user = await UserModel.findById({ _id: userId })
        let previousClaim = await ClaimModel.findById({ _id: id });
        let activities = previousClaim.activities;
        let timeStamp = new Date(Date.now());
        let date = timeStamp.toUTCString();
        if (previousClaim.status === 'close' && claimStatus === 'open') {
            let obj = {
                performer: userId,
                messageLogs: user.name + " re-opened the claim",
                timeStamp: date
            }
            // Save new job creation activity
            let newActivity = new ActivityModel({ ...obj });
            let savedActivity = await newActivity.save();
            activities.unshift(savedActivity)
            req.body.activities = activities;
        }
        else {
            let body = { ...req.body }
            const diff = jsondiffpatch.diff(previousClaim.toObject(), body);
            let message = [];

            for (var propName in diff) {
                let diffString = diff[propName].toString();
                var splitString = diffString.split(",");
                if (['status', 'waitTo'].includes(propName)) {
                    if (splitString[1] != undefined || splitString[1] != '') {

                        if (['waitTo'].includes(propName)) {
                            propName = 'waiting to'
                        }
                        if (['status'].includes(propName)) {
                            propName = 'claim status'
                        }
                        message[propName] = user.name + " updates " + propName + " from " + splitString[0] + " to " + splitString[1];
                    }
                }
                else {
                    if (['updates'].includes(propName)) {
                        message[propName] = user.name + " added " + propName;
                    }

                }
            }
            let obj = {
                timeStamp: date,
                messageLogs: Object.values(message),
                performer: userId
            };
            if (obj.messageLogs == '') {
                obj.messageLogs = user.name + " update nothing in this claim";
            }
            var activity = new ActivityModel({ ...obj });
            let savedActivity = await activity.save();
            activities.unshift(savedActivity)
            req.body.activities = activities;
        }
        let updatedClaim = await ClaimModel.findOneAndUpdate({ _id: id }, { ...req.body }, { new: true }).populate({
            path: 'job', populate: {
                path: 'assignee'
            }
        }).populate('customer');;
        if (updatedClaim) {
            res.status(status.success.created).json({
                message: 'Claim updated successfully',
                data: updatedClaim,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Claim not found',
                status: 400
            });
        }
    }),
    /**  
  * @swagger
  {    
    "/claim/{status}": {
        "post": {
            "tags": [
                "Claim"
            ],
            "parameters": [
                {
                    "in": "path",
                    "name": "status",
                    "type": "string",
                    "description": "Claim status"
                }
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Get all claims according to status",
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
                                }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Claims fetched successfully"
                }
            }
        }
    },
   
  }*/
    getAllClaims: asyncMiddleware(async (req, res) => {
        let { page } = req.body;
        let { status: claimStatus } = req.params
        if (claimStatus === 'all') {
            let claims = await ClaimModel.paginate({},
                { page: page, populate: 'customer job', sort: { createdAt: -1 } })
            res.status(status.success.created).json({
                message: 'Claims fetched successfully',
                data: claims,
                status: 200
            });
        }
        else {
            let claims = await ClaimModel.paginate({ status: claimStatus },
                { page: page, populate: 'job customer', sort: { createdAt: -1 } })
            res.status(status.success.created).json({
                message: 'Claims with status ' + claimStatus + ' fetched successfully',
                data: claims,
                status: 200
            });
        }
    }),
    /**  
      * @swagger
      {    
        "/claim/customer/{id}": {
            "get": {
                "tags": [
                    "Claim"
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
                        "description": "Customer ID"
                    }
                ],
                    "description": "Get all claims of specific customer",
                        "produces": [
                            "application/json"
                        ],
                "responses": {
                    "200": {
                        "description": "Claims fetched successfully"
                    },
                    "400":{
                      "description": "Claim not exists"  
                    }
                }
            }
        },
       
      }*/
    getClaimsbyID: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let claims = await ClaimModel.find({ customer: id }).populate('job').populate('customer');
        if (claims.length > 0) {
            res.status(status.success.created).json({
                message: 'Claims fetched successfully',
                data: claims,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Claim not exists',
                status: 400
            });
        }
    }),
    /**  
          * @swagger
          {    
            "/claim/search": {
                "post": {
                    "tags": [
                        "Claim"
                    ],
                    "security": [
                        {
                            "bearerAuth": []
                        }
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
                                    "type":"string"
                                }
                            }
                        }
                    }
                }
            },
                        "description": "Search claims of required customer",
                            "produces": [
                                "application/json"
                            ],
                    "responses": {
                        "200": {
                            "description": "Claims fetched successfully"
                        },
                        "400":{
                          "description": "Claim not exists"  
                        }
                    }
                }
            },
           
          }*/
    searchClaims: asyncMiddleware(async (req, res) => {
        let { query, page } = req.body;
        if (query) {
            let claims = await CustomerModel.paginate({
                $and: [{ "claim.0": { "$exists": true } }, {
                    $or: [
                        { firstName: { $regex: query, '$options': 'i' } }
                        , { lastName: { $regex: query, '$options': 'i' } },
                        { email: { $regex: query, '$options': 'i' } }]
                }],
            }, {
                populate: [{
                    path: 'claim',
                    populate: {
                        path: 'customer job',
                    },
                }

                ],
                page: 1,
                sort: { createdAt: -1 }
            })
            claims.docs = claims.docs.map((doc) => { return doc.claim });
            claims.docs = claims.docs[0];
            if (claims.docs.length > 0) {
                res.status(status.success.created).json({
                    message: 'Claims fetched successfully',
                    data: claims,
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'Claim not exists',
                    status: 400
                });
            }
        }
        else {
            let remainingClaims = await ClaimModel.paginate({}, { page: page, populate: 'customer job', sort: { createdAt: -1 } });
            if (remainingClaims.docs.length > 0) {
                res.status(status.success.created).json({
                    message: 'Claims fetched successfully',
                    data: remainingClaims,
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'Claim not exists',
                    status: 400
                });
            }
        }
    }),
}

//READ
router.get('/', jwt.verifyJwt, actions.getClaimbyID);
router.post('/:status', jwt.verifyJwt, actions.getAllClaims);

//ADD
router.post('/', jwt.verifyJwt, actions.addClaim);

//UPDATE
router.put('/:id', jwt.verifyJwt, actions.editClaim);

//DELETE
router.delete('/', jwt.verifyJwt, actions.deleteClaim)


// CLAIMS
router.get('/customer/:id', jwt.verifyJwt, actions.getClaimsbyID); // Claims of specific customer

//SEARCH CLAIMS
router.post('/search', jwt.verifyJwt, actions.searchClaims)

module.exports = router;