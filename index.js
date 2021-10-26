const express = require('express')
const app = express()
const port = process.env.PORT || 3001;
const routes = require('./route');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const autoIncrement = require('mongoose-auto-increment');
const swaggerJsdoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express");
const environment = process.env.NODE_ENV || 'development';
const config = require('./config/configuration');
const ErrlogModel = require('./models/errorLog');

config.initialize(environment);

app.use(cors());
app.use(express.json({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('Working!!!')
})

app.get('/error', (req, res) => {
    throw new Error('BROKEN')
})
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Athens Moving Expert",
            version: "",
            description:
                "",
            license: {
                name: "MIT",
                url: "https://spdx.org/licenses/MIT.html",
            },
            contact: {
                name: "LogRocket",
                url: "https://logrocket.com",
                email: "info@email.com",
            },
        },
        servers: [
            {
                url: "https://athens-backend.herokuapp.com/api/",
            },
            {
                url: "http://localhost:3000/api",
            }
        ],
        explorer: true,
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },
    apis: ["./routes/userRoutes.js", "./routes/customerRoutes.js", "./routes/jobRoutes.js",
        "./routes/moverRoutes.js", "./routes/scheduleRoutes.js", "./routes/blanketDepositRoutes.js", "./routes/claimRoutes.js"],
};

const specs = swaggerJsdoc(options);
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, { explorer: true })
);


app.use(async function (err, req, res, next) {
    
    const date = new Date(Date.now());                            // in activity model on job creation // 
    let newErr=new ErrlogModel({
        message:err.message,
        timeStamp:date.toUTCString(),
        apiPath:req.path,
        apiMethod:req.method,
        apiHost:req.hostname
    })
    let savedErr=await newErr.save();
    if(savedErr){
        console.error("75", err.stack)
        console.log("76", err.message)
        console.log("77", err)
        res.status(200).send('Something broke!')
    }
    
})

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => console.log(`Example app listening at ${port}`))