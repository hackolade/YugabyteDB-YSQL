const { AlterScriptDto } = require('../types/AlterScriptDto');
const { AlterRelationshipDto } = require('../types/AlterRelationshipDto');
const { getNamePrefixedWithSchemaName } = require('../../utils/general');
const { wrapInQuotes } = require('../../../shared/wrapInQuotes');
const ddlProvider = require('../../ddlProvider/ddlProvider')();

/**
 * @param relationship {AlterRelationshipDto}
 * @return string
 * */
const getRelationshipName = relationship => {
	return relationship.role.code || relationship.role.name;
};

/**
 * @param relationship {AlterRelationshipDto}
 * @return string
 * */
const getFullChildTableName = relationship => {
	const compMod = relationship.role.compMod;

	const childBucketName = compMod.child.bucket.name;
	const childEntityName = compMod.child.collection.name;
	return getNamePrefixedWithSchemaName(childEntityName, childBucketName);
};

/**
 * @param relationship {AlterRelationshipDto}
 * @return {{
 *     isActivated: boolean,
 *     statement: string,
 * }}
 * */
const getAddSingleForeignKeyStatementDto = relationship => {
	const compMod = relationship.role.compMod;

	const relationshipName = compMod.code?.new || compMod.name?.new || getRelationshipName(relationship) || '';

	return ddlProvider.createForeignKey({
		name: relationshipName,
		foreignKey: compMod.child.collection.fkFields,
		primaryKey: compMod.parent.collection.fkFields,
		customProperties: compMod.customProperties?.new,
		foreignTable: compMod.child.collection.name,
		foreignSchemaName: compMod.child.bucket.name,
		foreignTableActivated: compMod.child.collection.isActivated,
		primaryTable: compMod.parent.collection.name,
		primarySchemaName: compMod.parent.bucket.name,
		primaryTableActivated: compMod.parent.collection.isActivated,
		isActivated: Boolean(relationship.role?.compMod?.isActivated?.new),
	});
};

/**
 * @param relationship {AlterRelationshipDto}
 * @return boolean
 * */
const canRelationshipBeAdded = relationship => {
	const compMod = relationship.role.compMod;
	if (!compMod) {
		return false;
	}
	return [
		compMod.code?.new || compMod.name?.new || getRelationshipName(relationship),
		compMod.parent?.bucket,
		compMod.parent?.collection,
		compMod.parent?.collection?.fkFields?.length,
		compMod.child?.bucket,
		compMod.child?.collection,
		compMod.child?.collection?.fkFields?.length,
	].every(Boolean);
};

/**
 * @param addedRelationships {Array<AlterRelationshipDto>}
 * @return {Array<AlterScriptDto>}
 * */
const getAddForeignKeyScriptDtos = addedRelationships => {
	return addedRelationships
		.filter(relationship => canRelationshipBeAdded(relationship))
		.map(relationship => {
			const scriptDto = getAddSingleForeignKeyStatementDto(relationship);
			return AlterScriptDto.getInstance([scriptDto.statement], scriptDto.isActivated, false);
		})
		.filter(Boolean)
		.filter(res => res.scripts.some(scriptDto => Boolean(scriptDto.script)));
};

/**
 * @param relationship {AlterRelationshipDto}
 * @return {{
 *     isActivated: boolean,
 *     statement: string,
 * }}
 * */
const getDeleteSingleForeignKeyStatementDto = relationship => {
	const compMod = relationship.role.compMod;

	const ddlChildEntityName = getFullChildTableName(relationship);

	const relationshipName = compMod.code?.old || compMod.name?.old || getRelationshipName(relationship) || '';
	const ddlRelationshipName = wrapInQuotes(relationshipName);
	const statement = ddlProvider.dropForeignKey(ddlChildEntityName, ddlRelationshipName);

	const isRelationshipActivated = Boolean(relationship.role?.compMod?.isActivated?.new);
	const isChildTableActivated = compMod.child.collection.isActivated;
	return {
		statement,
		isActivated: isRelationshipActivated && isChildTableActivated,
	};
};

/**
 * @param relationship {AlterRelationshipDto}
 * @return {boolean}
 * */
const canRelationshipBeDeleted = relationship => {
	const compMod = relationship.role.compMod;
	if (!compMod) {
		return false;
	}
	return [
		compMod.code?.old || compMod.name?.old || getRelationshipName(relationship),
		compMod.child?.bucket,
		compMod.child?.collection,
	].every(Boolean);
};

/**
 * @param deletedRelationships {Array<AlterRelationshipDto>}
 * @return {Array<AlterScriptDto>}
 * */
const getDeleteForeignKeyScriptDtos = deletedRelationships => {
	return deletedRelationships
		.filter(relationship => canRelationshipBeDeleted(relationship))
		.map(relationship => {
			const scriptDto = getDeleteSingleForeignKeyStatementDto(relationship);
			return AlterScriptDto.getInstance([scriptDto.statement], scriptDto.isActivated, true);
		})
		.filter(Boolean)
		.filter(res => res.scripts.some(scriptDto => Boolean(scriptDto.script)));
};

/**
 * @param modifiedRelationships {Array<AlterRelationshipDto>}
 * @return {Array<AlterScriptDto>}
 * */
const getModifyForeignKeyScriptDtos = modifiedRelationships => {
	return modifiedRelationships
		.filter(relationship => canRelationshipBeAdded(relationship) && canRelationshipBeDeleted(relationship))
		.map(relationship => {
			const deleteScriptDto = getDeleteSingleForeignKeyStatementDto(relationship);
			const addScriptDto = getAddSingleForeignKeyStatementDto(relationship);
			const isActivated = addScriptDto.isActivated && deleteScriptDto.isActivated;
			return AlterScriptDto.getDropAndRecreateInstance(
				deleteScriptDto.statement,
				addScriptDto.statement,
				isActivated,
			);
		})
		.filter(Boolean)
		.filter(res => res.scripts.some(scriptDto => Boolean(scriptDto.script)));
};

module.exports = {
	getDeleteForeignKeyScriptDtos,
	getModifyForeignKeyScriptDtos,
	getAddForeignKeyScriptDtos,
};
