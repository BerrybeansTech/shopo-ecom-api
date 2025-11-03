// const path = require('path');
const { Sequelize } = require('sequelize');
console.log(".........................",process.env.DB_NAME, process.env.DB_PASSWORD,"....."); 

module.exports = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql'  
});
