const { AlterScriptDto } = require('../types/AlterScriptDto');
const { getModifySchemaCommentsScriptDtos } = require('./containerHelpers/commentsHelper');
const { wrapInQuotes } = require('../../../shared/wrapInQuotes');
const ddlProvider = require('../../ddlProvider/ddlProvider')();

/**
 * @param containerName {string}
 * @return AlterScriptDto
 * */
/**
 * @return {(name: string) => AlterScriptDto}
 * */
const getAddContainerScriptDto = containerName => {
	const script = ddlProvider.createSchemaOnly(wrapInQuotes(containerName));
	return AlterScriptDto.getInstance([script], true, false);
};

/**
 * @param containerName {string}
 * @return AlterScriptDto
 * */
const getDeleteContainerScriptDto = containerName => {
	const script = ddlProvider.dropSchema(wrapInQuotes(containerName));
	return AlterScriptDto.getInstance([script], true, false);
};

/**
 * @param container {Object}
 * @return Array<AlterScriptDto>
 * */
const getModifyContainerScriptDtos = container => {
	const modifyCommentScripts = getModifySchemaCommentsScriptDtos(container);

	return [...modifyCommentScripts];
};

module.exports = {
	getAddContainerScriptDto,
	getDeleteContainerScriptDto,
	getModifyContainerScriptDtos,
};
