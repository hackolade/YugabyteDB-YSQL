const _ = require('lodash');
const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');
const { getFullTableName, checkFieldPropertiesChanged } = require('../../../utils/general');
const { wrapInQuotes } = require('../../../../shared/wrapInQuotes');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getRenameColumnScriptDtos = collection => {
	const fullTableName = getFullTableName(collection);

	return _.values(collection.properties)
		.filter(jsonSchema => checkFieldPropertiesChanged(jsonSchema.compMod, ['name']))
		.map(jsonSchema => {
			const oldColumnName = wrapInQuotes(jsonSchema.compMod.oldField.name);
			const newColumnName = wrapInQuotes(jsonSchema.compMod.newField.name);
			return ddlProvider.renameColumn(fullTableName, oldColumnName, newColumnName);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
};

module.exports = {
	getRenameColumnScriptDtos,
};
