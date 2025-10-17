const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');
const {
	getFullTableName,
	wrapComment,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
} = require('../../../utils/general');
const ddlProvider = require('../../../ddlProvider/ddlProvider')();

/**
 * @param collection {AlterCollectionDto}
 * @return {AlterScriptDto | undefined}
 * */
const getUpdatedCommentOnCollectionScriptDto = collection => {
	const descriptionInfo = collection?.role.compMod?.description;
	if (!descriptionInfo) {
		return undefined;
	}

	const { old: oldComment, new: newComment } = descriptionInfo;
	if (!newComment || newComment === oldComment) {
		return undefined;
	}

	const tableName = getFullTableName(collection);
	const comment = wrapComment(newComment);

	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isContainerActivated && isObjectInDeltaModelActivated(collection);

	const script = ddlProvider.updateTableComment(tableName, comment);
	return AlterScriptDto.getInstance([script], isCollectionActivated, false);
};

/**
 * @param collection {AlterCollectionDto}
 * @return {AlterScriptDto | undefined}
 * */
const getDeletedCommentOnCollectionScriptDto = collection => {
	const descriptionInfo = collection?.role.compMod?.description;
	if (!descriptionInfo) {
		return '';
	}

	const { old: oldComment, new: newComment } = descriptionInfo;
	if (!oldComment || newComment) {
		return '';
	}

	const tableName = getFullTableName(collection);

	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isContainerActivated && isObjectInDeltaModelActivated(collection);

	const script = ddlProvider.dropTableComment(tableName);
	return AlterScriptDto.getInstance([script], isCollectionActivated, true);
};

/**
 * @param collection {AlterCollectionDto}
 * @return Array<AlterScriptDto>
 * */
const getModifyEntityCommentsScriptDtos = collection => {
	const updatedCommentScriptDto = getUpdatedCommentOnCollectionScriptDto(collection);
	const deletedCommentScriptDto = getDeletedCommentOnCollectionScriptDto(collection);

	return [updatedCommentScriptDto, deletedCommentScriptDto].filter(Boolean);
};

module.exports = {
	getModifyEntityCommentsScriptDtos,
};
