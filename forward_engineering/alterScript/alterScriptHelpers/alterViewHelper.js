const { AlterScriptDto } = require('../types/AlterScriptDto');
const { getModifyViewCommentsScriptDtos } = require('./viewHelpers/commentsHelper');
const { wrapInQuotes } = require('../../../shared/wrapInQuotes');
const { isViewActivated } = require('../../utils/general');
const ddlProvider = require('../../ddlProvider/ddlProvider')();

/**
 * @param view {Object}
 * @return {AlterScriptDto}
 * */
const getAddViewScriptDto = view => {
	const viewData = {
		name: view.code || view.name,
		keys: [],
		schemaData: { schemaName: '' },
	};
	const hydratedView = ddlProvider.hydrateView({ viewData, entityData: [view] });

	const viewActivated = isViewActivated(view);
	const script = ddlProvider.createView(hydratedView, {}, viewActivated);
	return AlterScriptDto.getInstance([script], viewActivated, false);
};

/**
 * @param view {Object}
 * @return {AlterScriptDto}
 * */
const getDeleteViewScriptDto = view => {
	const viewName = wrapInQuotes(view.code || view.name);

	const script = ddlProvider.dropView(viewName);
	return AlterScriptDto.getInstance([script], isViewActivated(view), true);
};

/**
 * @param view {Object}
 * @return {Array<AlterScriptDto>}
 * */
const getModifyViewScriptDtos = view => {
	const modifyCommentsScriptDtos = getModifyViewCommentsScriptDtos(view);

	return [...modifyCommentsScriptDtos];
};

module.exports = {
	getAddViewScriptDto,
	getDeleteViewScriptDto,
	getModifyViewScriptDtos,
};
