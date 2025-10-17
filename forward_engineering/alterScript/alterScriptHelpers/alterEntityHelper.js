const _ = require('lodash');
const { AlterCollectionDto } = require('../types/AlterCollectionDto');
const { AlterScriptDto } = require('../types/AlterScriptDto');
const { getModifyCheckConstraintScriptDtos } = require('./entityHelpers/checkConstraintHelper');
const { getModifyEntityCommentsScriptDtos } = require('./entityHelpers/commentsHelper');
const { getUpdateTypesScriptDtos } = require('./columnHelpers/alterTypeHelper');
const { getModifyNonNullColumnsScriptDtos } = require('./columnHelpers/nonNullConstraintHelper');
const { getModifiedCommentOnColumnScriptDtos } = require('./columnHelpers/commentsHelper');
const { getRenameColumnScriptDtos } = require('./columnHelpers/renameColumnHelper');
const { getModifyPkConstraintsScriptDtos } = require('./entityHelpers/primaryKeyHelper');
const { getEntityName, getFullTableName, getNamePrefixedWithSchemaName } = require('../../utils/general');
const { wrapInQuotes } = require('../../../shared/wrapInQuotes');
const { getModifiedDefaultColumnValueScriptDtos } = require('./columnHelpers/defaultValueHelper');
const { getModifyUniqueKeyConstraintsScriptDtos } = require('./entityHelpers/uniqueKeyHelper');
const ddlProvider = require('../../ddlProvider/ddlProvider')();

/**
 * @return {(collection: AlterCollectionDto) => {AlterScriptDto} }
 * */
const getAddCollectionScriptDto =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	collection => {
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const schemaName = collection.compMod.keyspaceName;
		const schemaData = { schemaName, dbVersion };
		const jsonSchema = { ...collection, ..._.omit(collection?.role, 'properties') };
		const columnDefinitions = _.toPairs(jsonSchema.properties).map(([name, column]) => {
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
		const checkConstraints = (jsonSchema.chkConstr || []).map(check =>
			ddlProvider.createCheckConstraint(ddlProvider.hydrateCheckConstraint(check)),
		);
		const tableData = {
			name: getEntityName(jsonSchema),
			columns: columnDefinitions.map(ddlProvider.convertColumnDefinition),
			checkConstraints: checkConstraints,
			foreignKeyConstraints: [],
			schemaData,
			columnDefinitions,
		};
		const hydratedTable = ddlProvider.hydrateTable({ tableData, entityData: [jsonSchema], jsonSchema });

		const script = ddlProvider.createTable(hydratedTable, jsonSchema.isActivated);
		return AlterScriptDto.getInstance([script], true, false);
	};

/**
 * @param collection {AlterCollectionDto}
 * @return AlterScriptDto
 * */
const getDeleteCollectionScriptDto = collection => {
	const fullName = getFullTableName(collection);

	const script = ddlProvider.dropTable(fullName);
	return AlterScriptDto.getInstance([script], true, true);
};

/**
 * @param collection {AlterCollectionDto}
 * @return {Array<AlterScriptDto>}
 * */
const getModifyCollectionScriptDtos = collection => {
	const modifyCheckConstraintScripts = getModifyCheckConstraintScriptDtos(collection);
	const modifyCommentScripts = getModifyEntityCommentsScriptDtos(collection);

	return [...modifyCheckConstraintScripts, ...modifyCommentScripts];
};

/**
 * @return {(collection: AlterCollectionDto) => AlterScriptDto[]}
 * */
const getModifyCollectionKeysScriptDtos =
	({ dbVersion }) =>
	collection => {
		const modifyPKConstraintDtos = getModifyPkConstraintsScriptDtos(collection);
		const modifyUniqueKeyConstraintDtos = getModifyUniqueKeyConstraintsScriptDtos({
			collection,
			dbVersion,
		});
		return [...modifyPKConstraintDtos, ...modifyUniqueKeyConstraintDtos].filter(Boolean);
	};

/**
 * @return {(collection: AlterCollectionDto) => Array<AlterScriptDto>}
 * */
const getAddColumnScriptDtos =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	collection => {
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const collectionSchema = { ...collection, ..._.omit(collection?.role, 'properties') };
		const tableName = getEntityName(collectionSchema);
		const schemaName = collectionSchema.compMod?.keyspaceName;
		const fullName = getNamePrefixedWithSchemaName(tableName, schemaName);
		const schemaData = { schemaName, dbVersion };

		return _.toPairs(collection.properties)
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
					parentJsonSchema: collectionSchema,
					ddlProvider,
					schemaData,
					definitionJsonSchema,
				});
			})
			.map(ddlProvider.convertColumnDefinition)
			.map(script => ddlProvider.addColumn(fullName, script))
			.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
	};

/**
 * @param collection {AlterCollectionDto}
 * @return {Array<AlterScriptDto>}
 * */
const getDeleteColumnScriptDtos = collection => {
	const collectionSchema = { ...collection, ..._.omit(collection?.role, 'properties') };
	const tableName = getEntityName(collectionSchema);
	const schemaName = collectionSchema.compMod?.keyspaceName;
	const fullName = getNamePrefixedWithSchemaName(tableName, schemaName);

	return _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => !jsonSchema.compMod)
		.map(([name]) => ddlProvider.dropColumn(fullName, wrapInQuotes(name)))
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, true));
};

/**
 * @param collection {AlterCollectionDto}
 * @return {Array<AlterScriptDto>}
 * */
const getModifyColumnScriptDtos = collection => {
	const renameColumnScriptDtos = getRenameColumnScriptDtos(collection);
	const updateTypeScriptDtos = getUpdateTypesScriptDtos(collection);
	const modifyNotNullScriptDtos = getModifyNonNullColumnsScriptDtos(collection);
	const modifyCommentScriptDtos = getModifiedCommentOnColumnScriptDtos(collection);
	const modifyDefaultColumnValueScriptDtos = getModifiedDefaultColumnValueScriptDtos({
		collection,
	});

	return [
		...renameColumnScriptDtos,
		...updateTypeScriptDtos,
		...modifyNotNullScriptDtos,
		...modifyDefaultColumnValueScriptDtos,
		...modifyCommentScriptDtos,
	];
};

module.exports = {
	getAddCollectionScriptDto,
	getDeleteCollectionScriptDto,
	getModifyCollectionScriptDtos,
	getAddColumnScriptDtos,
	getDeleteColumnScriptDtos,
	getModifyColumnScriptDtos,
	getModifyCollectionKeysScriptDtos,
};
