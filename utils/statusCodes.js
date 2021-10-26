const statusCode = {

    // Success Status
    success: {
        created: 201,
        accepted: 202
    },

    // Client Side Error
    client: {
        badRequest: 400,
        unAuthorized: 401,
        notFound: 404,
        notAcceptable: 406
    },

    // Server Error
    server: {
        internalServerError: 500,
        serviceUnavailable: 503,
    }
};

module.exports = statusCode;
