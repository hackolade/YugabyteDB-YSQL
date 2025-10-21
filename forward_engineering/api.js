const { applyToInstance } = require('./api/applyToInstance');
const { generateContainerScript } = require('./api/generateContainerScript');
const { generateScript } = require('./api/generateScript');
const { generateViewScript } = require('./api/generateViewScript');
const { getDatabases } = require('./api/getDatabases');
const { isDropInStatements } = require('./api/isDropInStatements');
const { testConnection } = require('./api/testConnection');

module.exports = {
	applyToInstance,
	generateContainerScript,
	generateScript,
	generateViewScript,
	getDatabases,
	isDropInStatements,
	testConnection,
};
