import { Emitter, Event } from 'vs/base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';

import { FileToTags, Tag } from 'vs/nex/platform/file-types';

export enum STORAGE_KEY {
	TAGS = 'nex.tags',
	RESOURCES_TO_TAGS = 'nex.resources.tags',
}

type STORAGE_TYPE = {
	'nex.tags'?: { [id in Tag['id']]: Omit<Tag, 'id'> };
	'nex.resources.tags'?: FileToTags;
};

export const NexStorage = createDecorator<NexStorage>('nexStorage');

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type NexStorage = {
	_serviceBrand: undefined;

	store: <T extends STORAGE_KEY>(key: T, value: STORAGE_TYPE[T]) => void;
	get: <T extends STORAGE_KEY>(key: T) => STORAGE_TYPE[T];
	onDataChanged: Event<STORAGE_KEY>;
};

export class NexStorageImpl implements NexStorage {
	public _serviceBrand: undefined;
	private readonly _onDataChanged = new Emitter<STORAGE_KEY>();

	public constructor(@IStorageService private readonly storageService: IStorageService) {}

	public store = <T extends STORAGE_KEY>(key: T, value: STORAGE_TYPE[T]) => {
		this.storageService.store(key, JSON.stringify(value), StorageScope.GLOBAL, StorageTarget.USER);
		this._onDataChanged.fire(key);
	};

	public get = <T extends STORAGE_KEY>(key: T): STORAGE_TYPE[T] => {
		const valueOfStore = this.storageService.get(key, StorageScope.GLOBAL);
		return valueOfStore === undefined ? undefined : JSON.parse(valueOfStore);
	};

	public onDataChanged = this._onDataChanged.event;
}

registerSingleton(NexStorage, NexStorageImpl);
