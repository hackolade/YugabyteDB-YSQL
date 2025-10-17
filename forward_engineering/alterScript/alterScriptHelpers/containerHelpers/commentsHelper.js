const { AlterScriptDto } = require('../../types/AlterScriptDto');
const { wrapComment } = require('../../../utils/general');
const { wrapInQuotes } = require('../../../../shared/wrapInQuotes');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param container {Object}
 * @return {{
 *     new?: string,
 *     old?: string,
 * }}
 * */
const extractDescription = container => {
	return container?.role?.compMod?.description || {};
};

/**
 * @param container {Object}
 * @return {AlterScriptDto | undefined}
 * */
const getUpsertCommentsScriptDto = container => {
	const description = extractDescription(container);
	if (description.new && description.new !== description.old) {
		const wrappedComment = wrapComment(description.new);
		const wrappedSchemaName = wrapInQuotes(container.role.name);
		const script = ddlProvider.updateSchemaComment(wrappedSchemaName, wrappedComment);
		return AlterScriptDto.getInstance([script], true, false);
	}
	return undefined;
};

/**
 * @param container {Object}
 * @return {AlterScriptDto | undefined}
 * */
const getDropCommentsScriptDto = container => {
	const description = extractDescription(container);
	if (description.old && !description.new) {
		const wrappedSchemaName = wrapInQuotes(container.role.name);
		const script = ddlProvider.dropSchemaComment(wrappedSchemaName);
		return AlterScriptDto.getInstance([script], true, true);
	}
	return undefined;
};

/**
 * @param container {Object}
 * @return Array<AlterScriptDto>
 * */
const getModifySchemaCommentsScriptDtos = container => {
	const upsertCommentScriptDto = getUpsertCommentsScriptDto(container);
	const dropCommentScriptDto = getDropCommentsScriptDto(container);
	return [upsertCommentScriptDto, dropCommentScriptDto].filter(Boolean);
};

module.exports = {
	getModifySchemaCommentsScriptDtos,
};
