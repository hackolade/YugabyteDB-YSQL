const { AlterScriptDto } = require('../types/AlterScriptDto');
const { getModifyViewCommentsScriptDtos } = require('./viewHelpers/commentsHelper');
const { wrapInQuotes } = require('../../../shared/wrapInQuotes');
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

	const script = ddlProvider.createView(hydratedView, {}, view.isActivated);
	return AlterScriptDto.getInstance([script], true, false);
};

/**
 * @param view {Object}
 * @return {AlterScriptDto}
 * */
const getDeleteViewScriptDto = view => {
	const viewName = wrapInQuotes(view.code || view.name);

	const script = ddlProvider.dropView(viewName);
	return AlterScriptDto.getInstance([script], true, true);
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
