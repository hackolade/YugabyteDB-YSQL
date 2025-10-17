const _ = require('lodash');
const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');
const { getFullColumnName, wrapComment } = require('../../../utils/general');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getUpdatedCommentOnColumnScriptDtos = collection => {
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
			return ddlProvider.updateColumnComment(columnName, ddlComment);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
};

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getDeletedCommentOnColumnScriptDtos = collection => {
	return _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const newComment = jsonSchema.description;
			const oldName = jsonSchema.compMod.oldField.name;
			const oldComment = collection.role.properties[oldName]?.description;
			return oldComment && !newComment;
		})
		.map(([name, jsonSchema]) => {
			const columnName = getFullColumnName(collection, name);
			return ddlProvider.dropColumnComment(columnName);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, true));
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
