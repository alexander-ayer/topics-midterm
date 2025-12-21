// src/db/index.js
// Db access entypoint. Exports initialized db instance for use by router

const { initDatabase } = require('./database');

async function getDb() {
    return initDatabase();
}

module.exports = { getDb };
