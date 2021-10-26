const jwt = require('jsonwebtoken');
const asyncMiddleWare = require('../utils/asyncMiddleware');
const status = require('../utils/statusCodes');
const TokenModel = require('../models/token');

async function signJwt(data, expiry) {
    let { SECRET_KEY, EXPIRES_IN } = process.env;
    if (expiry === EXPIRES_IN) {
        let accessToken = jwt.sign(data, SECRET_KEY, {
            expiresIn: expiry,
        }, { algorithm: 'HS256' });
        return accessToken
    } else {
        let refreshToken = jwt.sign(data, SECRET_KEY, {
            expiresIn: expiry,
        }, { algorithm: 'HS256' });
        await new TokenModel({ token: 'Bearer ' + refreshToken }).save();
        return refreshToken
    }
}

async function verifyJwt(req, res, next) {
    let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
    if (token) {
        // Remove Bearer from string
        token = token.slice(7, token.length);
        jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
            if (decoded) {
                req.decoded = decoded;
                next();
            } else {
                res.status(status.client.unAuthorized).send(new Error('Token is not valid'))
            }
        });
    } else {
        res.status(status.client.badRequest).json({
            message: 'Auth token is not supplied'
        });
    }
}


module.exports = {
    signJwt,
    verifyJwt,
};