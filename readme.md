# Athens Moving Expert
This is the backend server build on NodeJS and ExpressJS, a framework for writing effective NodeJS code. It is based on APIs handling athens moving expert internal management.

## Getting Started
In order to run this code in your local machine.Follow following steps:

1) Run **npm i** command on the project directory terminal.

2) Set environment variables namely **EMAIL** , **PASSWORD** , **STRIPE_KEY** , **DB_URL** and **SECRET_KEY**
3) Now type **nodemon** or **node index.js** to start server on your local machine.

## Pre-requisites

1) Install latest version of NodeJS.
2) Having a database connection URL.
3) Having a stripe account and its key.
4) Having an email account for sending mail throughout the application 

## Dependencies
Some of the popular dependencies we used are as follows:

1) **bcrypt** - for password hashing.
2) **jwt** - for authentication of user by generating and authenticating token.
3) **node-mailer** - for sending mails.
4) **ejs** - for modifying or templating mail structure.

