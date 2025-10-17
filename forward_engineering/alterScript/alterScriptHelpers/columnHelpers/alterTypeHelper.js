const _ = require('lodash');
const { AlterCollectionDto, AlterCollectionColumnDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');
const {
	getFullTableName,
	checkFieldPropertiesChanged,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
} = require('../../../utils/general');
const { wrapInQuotes } = require('../../../../shared/wrapInQuotes');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param collection {AlterCollectionDto}
 * @param oldFieldName {string}
 * @param currentJsonSchema {AlterCollectionColumnDto}
 * @return boolean
 * */
const hasLengthChanged = (collection, oldFieldName, currentJsonSchema) => {
	const oldProperty = collection.role.properties[oldFieldName];

	const previousLength = oldProperty?.length;
	const newLength = currentJsonSchema?.length;
	return previousLength !== newLength;
};

/**
 * @param collection {AlterCollectionDto}
 * @param oldFieldName {string}
 * @param currentJsonSchema {AlterCollectionColumnDto}
 * @return boolean
 * */
const hasPrecisionOrScaleChanged = (collection, oldFieldName, currentJsonSchema) => {
	const oldProperty = collection.role.properties[oldFieldName];

	const previousPrecision = oldProperty?.precision;
	const newPrecision = currentJsonSchema?.precision;
	const previousScale = oldProperty?.scale;
	const newScale = currentJsonSchema?.scale;

	return previousPrecision !== newPrecision || previousScale !== newScale;
};

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getUpdateTypesScriptDtos = collection => {
	const fullTableName = getFullTableName(collection);
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);

	return _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const hasTypeChanged = checkFieldPropertiesChanged(jsonSchema.compMod, ['type', 'mode']);
			if (!hasTypeChanged) {
				const oldName = jsonSchema.compMod.oldField.name;
				const isNewLength = hasLengthChanged(collection, oldName, jsonSchema);
				const isNewPrecisionOrScale = hasPrecisionOrScaleChanged(collection, oldName, jsonSchema);
				return isNewLength || isNewPrecisionOrScale;
			}
			return hasTypeChanged;
		})
		.map(([name, jsonSchema]) => {
			const typeName = jsonSchema.compMod.newField.mode || jsonSchema.compMod.newField.type;
			const columnName = wrapInQuotes(name);
			const typeConfig = _.pick(jsonSchema, ['length', 'precision', 'scale']);
			const isActivated = isContainerActivated && isCollectionActivated && jsonSchema.isActivated;
			return {
				script: ddlProvider.alterColumnType(fullTableName, columnName, typeName, typeConfig),
				isActivated,
			};
		})
		.map(({ script, isActivated }) => AlterScriptDto.getInstance([script], isActivated, false));
};

module.exports = {
	getUpdateTypesScriptDtos,
};
