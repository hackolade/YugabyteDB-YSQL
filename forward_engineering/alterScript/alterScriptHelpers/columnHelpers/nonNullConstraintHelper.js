const _ = require('lodash');
const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');
const {
	getFullTableName,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
} = require('../../../utils/general');
const { wrapInQuotes } = require('../../../../shared/wrapInQuotes');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getModifyNonNullColumnsScriptDtos = collection => {
	const fullTableName = getFullTableName(collection);

	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);

	const currentRequiredColumnNames = collection.required || [];
	const previousRequiredColumnNames = collection.role.required || [];

	const columnNamesToAddNotNullConstraint = _.difference(currentRequiredColumnNames, previousRequiredColumnNames);
	const columnNamesToRemoveNotNullConstraint = _.difference(previousRequiredColumnNames, currentRequiredColumnNames);

	const addNotNullConstraintsScripDtos = _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod.oldField.name;
			const shouldRemoveForOldName = columnNamesToRemoveNotNullConstraint.includes(oldName);
			const shouldAddForNewName = columnNamesToAddNotNullConstraint.includes(name);
			return shouldAddForNewName && !shouldRemoveForOldName;
		})
		.map(([columnName, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && jsonSchema.isActivated;
			const script = ddlProvider.setNotNullConstraint(fullTableName, wrapInQuotes(columnName));
			return { script, isActivated };
		})
		.map(({ script, isActivated }) => AlterScriptDto.getInstance([script], isActivated, false));

	const removeNotNullConstraintDtos = _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod.oldField.name;
			const shouldRemoveForOldName = columnNamesToRemoveNotNullConstraint.includes(oldName);
			const shouldAddForNewName = columnNamesToAddNotNullConstraint.includes(name);
			return shouldRemoveForOldName && !shouldAddForNewName;
		})
		.map(([name, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && jsonSchema.isActivated;
			const script = ddlProvider.dropNotNullConstraint(fullTableName, wrapInQuotes(name));
			return { script, isActivated };
		})
		.map(({ script, isActivated }) => AlterScriptDto.getInstance([script], isActivated, true));

	return [...addNotNullConstraintsScripDtos, ...removeNotNullConstraintDtos];
};

module.exports = {
	getModifyNonNullColumnsScriptDtos,
};
