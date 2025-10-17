const _ = require('lodash');
const { AlterScriptDto } = require('../types/AlterScriptDto');
const { getUdtName, checkFieldPropertiesChanged } = require('../../utils/general');
const { wrapInQuotes } = require('../../../shared/wrapInQuotes');
const ddlProvider = require('../../ddlProvider/ddlProvider')();

/**
 * @return { (jsonSchema: Object) => AlterScriptDto }
 * */
const getCreateUdtScriptDto =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	jsonSchema => {
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const schemaData = { dbVersion };

		const columnDefinitions = _.toPairs(jsonSchema.properties || {}).map(([name, column]) => {
			const definitionJsonSchema = getDefinitionByReference({
				propertySchema: column,
				modelDefinitions,
				internalDefinitions,
				externalDefinitions,
			});

			return createColumnDefinitionBySchema({
				name,
				jsonSchema: column,
				parentJsonSchema: jsonSchema,
				ddlProvider,
				schemaData,
				definitionJsonSchema,
			});
		});

		const updatedUdt = createColumnDefinitionBySchema({
			name: jsonSchema.code || jsonSchema.name,
			jsonSchema: jsonSchema,
			parentJsonSchema: { required: [] },
			definitionJsonSchema: {},
			ddlProvider,
			schemaData,
		});

		const udt = { ...updatedUdt, properties: columnDefinitions };

		const script = ddlProvider.createUdt(udt);
		return AlterScriptDto.getInstance([script], true, false);
	};

/**
 * @param udt {Object}
 * @return {AlterScriptDto}
 * */
const getDeleteUdtScriptDto = udt => {
	const udtName = getUdtName(udt);
	const ddlUdtName = wrapInQuotes(udtName);

	if (udt.type === 'domain') {
		const script = ddlProvider.dropDomain(ddlUdtName);
		return AlterScriptDto.getInstance([script], true, true);
	} else {
		const script = ddlProvider.dropType(ddlUdtName);
		return AlterScriptDto.getInstance([script], true, true);
	}
};

/**
 * @return { (udt: Object) => Array<AlterScriptDto> }
 * */
const getAddColumnToTypeScriptDtos =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	udt => {
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const fullName = wrapInQuotes(getUdtName(udt));
		const schemaData = { dbVersion };

		return _.toPairs(udt.properties)
			.filter(([name, jsonSchema]) => !jsonSchema.compMod)
			.map(([name, jsonSchema]) => {
				const definitionJsonSchema = getDefinitionByReference({
					propertySchema: jsonSchema,
					modelDefinitions,
					internalDefinitions,
					externalDefinitions,
				});

				return createColumnDefinitionBySchema({
					name,
					jsonSchema,
					parentJsonSchema: { required: [] },
					ddlProvider,
					schemaData,
					definitionJsonSchema,
				});
			})
			.map(ddlProvider.convertColumnDefinition)
			.map(script => ddlProvider.alterTypeAddAttribute(fullName, script))
			.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
	};

/**
 * @param udt {Object}
 * @return {Array<AlterScriptDto>}
 * */
const getDeleteColumnFromTypeScriptDtos = udt => {
	const fullName = wrapInQuotes(getUdtName(udt));

	return _.toPairs(udt.properties)
		.filter(([name, jsonSchema]) => !jsonSchema.compMod)
		.map(([name]) => ddlProvider.alterTypeDropAttribute(fullName, wrapInQuotes(name)))
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, true));
};

/**
 * @param udt {Object}
 * @return {Array<AlterScriptDto>}
 * */
const getModifyColumnOfTypeScriptDtos = udt => {
	const fullName = wrapInQuotes(getUdtName(udt));

	const renameColumnScriptDtos = _.values(udt.properties)
		.filter(jsonSchema => checkFieldPropertiesChanged(jsonSchema.compMod, ['name']))
		.map(jsonSchema => {
			const oldColumnDdlName = wrapInQuotes(jsonSchema.compMod.oldField.name);
			const newColumnDdlName = wrapInQuotes(jsonSchema.compMod.newField.name);
			return ddlProvider.alterTypeRenameAttribute(fullName, oldColumnDdlName, newColumnDdlName);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));

	const changeTypeScriptDtos = _.toPairs(udt.properties)
		.filter(([name, jsonSchema]) => checkFieldPropertiesChanged(jsonSchema.compMod, ['type', 'mode']))
		.map(([name, jsonSchema]) => {
			const ddlColumnName = wrapInQuotes(name);
			const columnType = jsonSchema.compMod.newField.mode || jsonSchema.compMod.newField.type;
			return ddlProvider.alterTypeChangeAttributeType(fullName, ddlColumnName, columnType);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));

	return [...renameColumnScriptDtos, ...changeTypeScriptDtos];
};

module.exports = {
	getCreateUdtScriptDto,
	getDeleteUdtScriptDto,
	getAddColumnToTypeScriptDtos,
	getDeleteColumnFromTypeScriptDtos,
	getModifyColumnOfTypeScriptDtos,
};
