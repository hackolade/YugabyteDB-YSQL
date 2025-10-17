const _ = require('lodash');
const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');
const {
	getFullTableName,
	checkFieldPropertiesChanged,
	isParentContainerActivated,
	isObjectInDeltaModelActivated,
} = require('../../../utils/general');
const { wrapInQuotes } = require('../../../../shared/wrapInQuotes');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getRenameColumnScriptDtos = collection => {
	const fullTableName = getFullTableName(collection);

	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);

	return _.values(collection.properties)
		.filter(jsonSchema => checkFieldPropertiesChanged(jsonSchema.compMod, ['name']))
		.map(jsonSchema => {
			const oldColumnName = wrapInQuotes(jsonSchema.compMod.oldField.name);
			const newColumnName = wrapInQuotes(jsonSchema.compMod.newField.name);
			const isActivated = isContainerActivated && isCollectionActivated && jsonSchema.isActivated;
			return { script: ddlProvider.renameColumn(fullTableName, oldColumnName, newColumnName), isActivated };
		})
		.map(({ script, isActivated }) => AlterScriptDto.getInstance([script], isActivated, false));
};

module.exports = {
	getRenameColumnScriptDtos,
};
