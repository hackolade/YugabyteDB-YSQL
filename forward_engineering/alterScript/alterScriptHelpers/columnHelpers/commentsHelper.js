const _ = require('lodash');
const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');
const {
	getFullColumnName,
	wrapComment,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
} = require('../../../utils/general');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getUpdatedCommentOnColumnScriptDtos = collection => {
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);

	return _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const newComment = jsonSchema.description;
			const oldName = jsonSchema.compMod.oldField.name;
			const oldComment = collection.role.properties[oldName]?.description;
			return newComment && (!oldComment || newComment !== oldComment);
		})
		.map(([name, jsonSchema]) => {
			const newComment = jsonSchema.description;
			const ddlComment = wrapComment(newComment);
			const columnName = getFullColumnName(collection, name);
			const isActivated = isContainerActivated && isCollectionActivated && jsonSchema.isActivated;
			return { script: ddlProvider.updateColumnComment(columnName, ddlComment), isActivated };
		})
		.map(({ script, isActivated }) => AlterScriptDto.getInstance([script], isActivated, false));
};

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getDeletedCommentOnColumnScriptDtos = collection => {
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);

	return _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const newComment = jsonSchema.description;
			const oldName = jsonSchema.compMod.oldField.name;
			const oldComment = collection.role.properties[oldName]?.description;
			return oldComment && !newComment;
		})
		.map(([name, jsonSchema]) => {
			const columnName = getFullColumnName(collection, name);
			const isActivated = isContainerActivated && isCollectionActivated && jsonSchema.isActivated;
			return { script: ddlProvider.dropColumnComment(columnName), isActivated };
		})
		.map(({ script, isActivated }) => AlterScriptDto.getInstance([script], isActivated, true));
};

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getModifiedCommentOnColumnScriptDtos = collection => {
	const updatedCommentScriptDtos = getUpdatedCommentOnColumnScriptDtos(collection);
	const deletedCommentScriptDtos = getDeletedCommentOnColumnScriptDtos(collection);
	return [...updatedCommentScriptDtos, ...deletedCommentScriptDtos];
};

module.exports = {
	getModifiedCommentOnColumnScriptDtos,
};
