import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { NexFileSystem } from 'vs/nex/platform/logic/file-system';
import { NexClipboard } from 'vs/nex/platform/logic/clipboard';
import { NexStorage } from 'vs/nex/platform/logic/storage';
import { createApp } from 'vs/nex/index';

export class NexApp {
	private app: ReturnType<typeof createApp>;

	public constructor(
		@IModeService modeService: IModeService,
		@IModelService modelService: IModelService,
		@NexFileSystem fileSystem: NexFileSystem,
		@NexClipboard clipboard: NexClipboard,
		@NexStorage storage: NexStorage,
	) {
		this.app = createApp(modeService, modelService, fileSystem, clipboard, storage);
	}

	public renderApp(target: HTMLElement) {
		this.app.renderApp(target);
	}
}
