const CustomerModel = require('../models/customer');
const asyncMiddleware = require('../utils/asyncMiddleware');
const status = require('../utils/statusCodes');
const passwordUtils = require('../utils/passwordHash');

const ClaimModel = require('../models/claim');
const JobModel = require('../models/job');
const BlanketDepositModel = require('../models/blanketDeposit');
const ActivityModel = require('../models/activityLog');

const express = require('express');
const router = express.Router();
const jwt = require('../utils/jwt');
/**  
@swagger
{
    "components": {
        "schemas": {
            "Customer": {
                "type": "object",
                    "required": [
                        "email"
                    ],
                    "properties": {
                        "firstName": {
                        "type": "string"
                    },
                     "lastName": {
                        "type": "string"
                    },
                     "phone": {
                        "type": "string"
                    },
                     "email": {
                        "type": "string",
                        "format":"email"
                    },
                     "subcontacts": {
                        "type": "object",
                        "properties": {
                            "emailContacts":{
                               "type": "string" ,
                                "format":"email"
                            },
                             "phoneContacts":{
                               "type": "string" 
                            }
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
    "/customer": {
        "get": {
            "tags": [
                "Customer"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Get Customer List",
                    "produces": [
                        "application/json"
                    ],
                        "responses": {
                "200": {
                    "description": "Customer fetched successfully"
                },
                "400":{
                  "description": "Something went wrong"  
                }
                
            }
        },
        "post": {
            "tags": [
                "Customer"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Customer registration",
                    "produces": [
                        "application/json"
                    ],
                        "requestBody": {
                             "description": "Request Body",
                                 "content": {
                                    "application/json": {
                                             "schema": {
                                                "$ref": "#/components/schemas/Customer"
                                                       }
                                                }
                                        }
            },
            "responses": {
                "200": {
                    "description": "Customer added successfully"
                },
                "400":{
                  "description": "Something went wrong"  
                }
            }
        },
        "delete": {
            "tags": [
                "Customer"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Delete customer",
                    "produces": [
                        "application/json"
                    ],
                        "parameters": [
                            {
                                "in": "query",
                                "name": "id",
                                "type": "string",
                                "description": "Customer ID"
                            },
                            {
                                "in": "query",
                                "name": "page",
                                "type": "integer",
                                "description": "Page number"
                            },
                        ],
                            "responses": {
                "200": {
                    "description": "Customer deleted successfully"
                },
                "400": {
                    "description": "Customer not found"
                }
            }
        }
    },
    
   }*/
    // Register the customer 
    customerRegistration: asyncMiddleware(async (req, res) => {
        let { email, firstName, lastName, phone } = req.body;
        let customer = await CustomerModel.findOne({ email: email });
        if (customer) {
            res.status(status.success.accepted).json({
                message: 'Email already exists',
                status: 400
            });
        } else {
            // Save new customer to db
            req.body.plainPhone = phone.replace(/[^a-zA-Z0-9]/g, "");
            req.body.plainName = firstName.toLowerCase() + " " + lastName.toLowerCase();
            let newCustomer = new CustomerModel({ ...req.body });
            let savedCustomer = await newCustomer.save();
            if (savedCustomer) {
                res.status(status.success.created).json({
                    message: 'Customer added successfully',
                    data: savedCustomer,
                    status: 200
                });
            }
            else {
                res.status(status.success.created).json({
                    message: 'Something went wrong',
                    status: 400
                });
            }
        }
    }),
    getCustomerList: asyncMiddleware(async (req, res) => {
        let customer = await CustomerModel.find({}).sort({ createdAt: 1 }).select('firstName lastName email _id');
        if (customer) {
            res.status(status.success.created).json({
                message: 'Customers fetched successfully',
                data: customer,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Customer not found',
                status: 400
            });
        }
    }),
    deleteCustomer: asyncMiddleware(async (req, res) => {
        let { id, page } = req.query;
        let customer = await CustomerModel.findByIdAndDelete(id);

        if (customer) {
            let claims = await ClaimModel.find({ _id: { $in: customer.claim } })
            await ClaimModel.deleteMany({ _id: { $in: claims } });
            for (let i = 0; i < claims.length; i++) {
                await ActivityModel.deleteMany({ _id: { $in: claims[i].activities } });
            }
            let blanketDeposits = await BlanketDepositModel.find({ _id: { $in: customer.blanketDeposit } })
            await BlanketDepositModel.deleteMany({ _id: { $in: blanketDeposits } });
            for (let i = 0; i < blanketDeposits.length; i++) {
                await ActivityModel.deleteMany({ _id: { $in: blanketDeposits[i].activities } });
            }

            let jobs = await JobModel.find({ _id: { $in: customer.jobs } })
            await JobModel.deleteMany({ _id: { $in: jobs } });
            for (let i = 0; i < jobs.length; i++) {
                await ActivityModel.deleteMany({ _id: { $in: jobs[i].activities } });
            }
            let remainingCustomers = await CustomerModel.paginate({},
                {
                    page: page, populate: { path: 'claim', select: { 'status': 1, '_id': 0 } }, lean: true, sort: { createdAt: -1 }
                });
            res.status(status.success.created).json({
                message: 'Customer deleted successfully',
                data: remainingCustomers,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Customer not found',
                status: 400
            });
        }
    }),

    /**  
* @swagger
{
    "/customer/{id}": {
        "put": {
            "tags": [
                "Customer"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Update customer",
                    "produces": [
                        "application/json"
                    ],
                        "parameters": [
                            {
                                "in": "path",
                                "name": "id",
                                "type": "string",
                                "description": "Customer ID"

                            },

                        ],
                            "requestBody": {
                "description": "Request Body",
                    "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Customer"
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Customer updated sucessfully"
                },
                "400": {
                    "description": "Something went wrong"
                }
            }
        }
    },

}*/
    updateCustomer: asyncMiddleware(async (req, res) => {
        let { email, firstName, lastName, phone } = req.body;
        let { id } = req.params;
        let customer = await CustomerModel.find({ email: email });
        if (customer.length > 1) {
            res.status(status.success.created).json({
                message: 'Similar email already exists',
                status: 400
            });
        }
        else {
            if (customer.length == 1 || customer.length == 0) {
                req.body.plainPhone = (phone ? phone.replace(/[^a-zA-Z0-9]/g, "") : phone);
                req.body.plainName = firstName.toLowerCase() + " " + lastName.toLowerCase();
                let updatedCustomer = await CustomerModel.findByIdAndUpdate({ _id: id }, { ...req.body }, { new: true })
                if (updatedCustomer) {
                    res.status(status.success.created).json({
                        message: 'Customer updated successfully',
                        data: updatedCustomer,
                        status: 200
                    });
                } else {
                    res.status(status.success.created).json({
                        message: 'Something went wrong',
                        status: 400
                    });
                }
            }

        }
    }),

    /**  
    * @swagger
    {    
     "/customer/details/{id}": {
         "get": {
             "tags": [
                 "Customer"
             ],
             "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                 "description": "Get specific customer details",
                     "produces": [
                         "application/json"
                     ],
                         "parameters": [
                             {
                                 "in": "path",
                                 "name": "id",
                                 "type": "string",
                                 "description": "Customer ID"
 
                             },
 
                         ],
                             "responses": {
                 "200": {
                     "description": "Customer fetched successfully"
                 },
                 "400": {
                     "description": "Customer not found"
                 }
             }
         }
     },
     
    }*/
    // Get single customer details
    getCustomer: asyncMiddleware(async (req, res) => {
        let { id } = req.params;
        let customer = await CustomerModel.findById({ _id: id }).lean().populate({
            path: 'jobs', populate: {
                path: 'assignee'
            }
        }).populate({
            path: 'claim', populate: {
                path: 'job'
            }
        })
            .populate({
                path: 'blanketDeposit',
                populate: [{
                    path: 'activities', populate: {
                        path: 'performer', select: { 'name': 1 }
                    }
                }, {
                    path: 'job',
                    select: { 'jobId': 1 },
                }]
            });//'blanketDeposit'
        if (customer) {
            res.status(status.success.created).json({
                message: 'Customer fetched successfully',
                data: customer,
                status: 200
            });
        }
        else {
            res.status(status.success.created).json({
                message: 'Customer not found',
                status: 400
            });
        }
    }),


    /**  
       * @swagger
       {    
        "/customer/all": {
            "post": {
                "tags": [
                    "Customer"
                ],
                "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                    "description": "Get all customers",
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
                                            "plainName":
                                            {
                                                "type": "integer"
                                            },
                                            "createdAt":
                                            {
                                                "type": "integer"
                                            },
                                            "updatedAt":
                                            {
                                                "type": "integer"
                                            },
                                        }
                                    },
                                    "query": {
                                        "type": "string",
                               }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Customers fetched successfully"
                    },
                    "400": {
                        "description": "Something went wrong"
                    }
                }
            }
        },
        
       }*/
    // Get all customers created first 
    getAllCustomer: asyncMiddleware(async (req, res) => {
        let { sort, query, page } = req.body;
        for (var propName in sort) {
            if (sort[propName] === null || sort[propName] === undefined || sort[propName] == '') {
                delete sort[propName]; // Filter sort object 
            }
        }
        try {
            new RegExp(query);
        } catch (e) {
            query = query.replace(/[^a-zA-Z0-9]/g, "");
        }
        //Filter and search customers
        let paginateCustomers = await CustomerModel.paginate({
            $or: [
                { 'plainName': { $regex: query, '$options': 'i' } }, { 'plainPhone': { $regex: query.replace(/[^a-zA-Z0-9]/g, "") } }, { 'email': { $regex: query, '$options': 'i' } } // search on name and email 
            ]
        },
            {
                page: page, sort: sort, populate: { path: 'claim', select: { 'status': 1, '_id': 0 } }, lean: true,
            })

        if (paginateCustomers.docs) {
            res.status(status.success.created).json({
                message: 'Customers fetched successfully',
                data: paginateCustomers,
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
    "/customer/jobs": {
        "get": {
            "tags": [
                "Customer"
            ],
            "security": [
                    {
                        "bearerAuth": []
                    }
                ],
                "description": "Get all customers along with their jobs",
                    "produces": [
                        "application/json"
                    ],
                        "responses": {
                "200": {
                    "description": "Customers and Jobs fetched successfully"
                },
                "400": {
                    "description": "Something went wrong"
                }
            }
        }
    },
    
   }*/
    getAllCustomersJobs: asyncMiddleware(async (req, res) => {
        let customers = await CustomerModel.find({}, 'firstName lastName email _id jobs claim').lean().populate('jobs', 'title status jobId').populate('claim');
        if (customers) {
            res.status(status.success.created).json({
                message: 'Customers and Jobs  fetched successfully',
                data: customers,
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


}

//READ
router.get('/', jwt.verifyJwt, actions.getCustomerList)

//ADD
router.post('/', jwt.verifyJwt, actions.customerRegistration)

//UPDATE
router.put('/:id', jwt.verifyJwt, actions.updateCustomer)

//DELETE
router.delete('/', jwt.verifyJwt, actions.deleteCustomer)

// CUSTOMER
router.post('/all', jwt.verifyJwt, actions.getAllCustomer)
router.get('/details/:id', jwt.verifyJwt, actions.getCustomer)
router.get('/jobs', jwt.verifyJwt, actions.getAllCustomersJobs)




module.exports = router;