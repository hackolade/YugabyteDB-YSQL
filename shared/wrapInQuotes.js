const _ = require('lodash');
const { ReservedWordsAsArray } = require('./enums/reservedWords');

const wrapInQuotes = name =>
	/\s|\W/.test(name) || _.includes(ReservedWordsAsArray, _.toUpper(name)) ? `"${name}"` : name;

module.exports = { wrapInQuotes };
