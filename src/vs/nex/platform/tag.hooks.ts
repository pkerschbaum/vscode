import * as React from 'react';
import { nanoid } from '@reduxjs/toolkit';

import { createLogger } from 'vs/nex/base/logger/logger';
import { useNexStorage } from 'vs/nex/NexStorage.provider';
import { STORAGE_KEY } from 'vs/nex/platform/logic/storage';
import { Tag } from 'vs/nex/platform/file-types';
import { useRerenderOnEventFire } from 'vs/nex/platform/store/util/hooks.util';

const logger = createLogger('tag.hooks');

export function useTagsActions() {
	const storage = useNexStorage();

	useRerenderOnEventFire(
		storage.onDataChanged,
		React.useCallback((storageKey) => storageKey === STORAGE_KEY.TAGS, []),
	);

	return {
		addTag: (tagData: Omit<Tag, 'id'>): Tag => {
			logger.debug(`adding tag to storage...`, { tagData });

			const tags = storage.get(STORAGE_KEY.TAGS) ?? {};
			const id = nanoid();
			tags[id] = tagData;
			storage.store(STORAGE_KEY.TAGS, tags);

			const tag = { ...tagData, id };
			logger.debug(`tag added to storage!`, { tag });
			return tag;
		},

		getTags: () => {
			const tags = storage.get(STORAGE_KEY.TAGS) ?? {};
			logger.debug(`got tags from storage`, { tags });
			return tags;
		},

		removeTags: (tagIds: Tag['id'][]) => {
			logger.debug(`removing tags from storage...`, { tagIds });

			const tags = storage.get(STORAGE_KEY.TAGS) ?? {};
			for (const tagId of tagIds) {
				delete tags[tagId];
			}
			storage.store(STORAGE_KEY.TAGS, tags);

			logger.debug(`tags removed from storage!`);
		},
	};
}
