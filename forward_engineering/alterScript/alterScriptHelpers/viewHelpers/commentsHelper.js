const { AlterScriptDto } = require('../../types/AlterScriptDto');
const {
	getFullViewName,
	wrapComment,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
} = require('../../../utils/general');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param view {Object}
 * @return {{
 *     new?: string,
 *     old?: string,
 * }}
 * */
const extractDescription = view => {
	return view?.role?.compMod?.description || {};
};

/**
 * @param view {Object}
 * @return {AlterScriptDto | undefined}
 * */
const getUpsertCommentsScriptDto = view => {
	const description = extractDescription(view);
	if (description.new && description.new !== description.old) {
		const wrappedComment = wrapComment(description.new);
		const viewName = getFullViewName(view);

		const isContainerActivated = isParentContainerActivated(view);
		const isViewActivated = isContainerActivated && isObjectInDeltaModelActivated(view);

		const script = ddlProvider.updateViewComment(viewName, wrappedComment);
		return AlterScriptDto.getInstance([script], isViewActivated, false);
	}
	return undefined;
};

/**
 * @param view {Object}
 * @return {AlterScriptDto | undefined}
 * */
const getDropCommentsScriptDto = view => {
	const description = extractDescription(view);

	if (description.old && !description.new) {
		const viewName = getFullViewName(view);

		const isContainerActivated = isParentContainerActivated(view);
		const isViewActivated = isContainerActivated && isObjectInDeltaModelActivated(view);

		const script = ddlProvider.dropViewComment(viewName);
		return AlterScriptDto.getInstance([script], isViewActivated, true);
	}
	return undefined;
};

/**
 * @param view {Object}
 * @return {Array<AlterScriptDto>}
 * */
const getModifyViewCommentsScriptDtos = view => {
	const upsertCommentScriptDto = getUpsertCommentsScriptDto(view);
	const dropCommentScriptDto = getDropCommentsScriptDto(view);
	return [upsertCommentScriptDto, dropCommentScriptDto].filter(Boolean);
};

module.exports = {
	getModifyViewCommentsScriptDtos,
};
