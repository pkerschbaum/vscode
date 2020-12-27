import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { NexFileSystem } from 'vs/nex/platform/logic/file-system';
import { NexClipboard } from 'vs/nex/platform/logic/clipboard';
import { createApp } from 'vs/nex/index';

export class NexApp {
	private app: ReturnType<typeof createApp>;

	public constructor(
		@IModeService modeService: IModeService,
		@IModelService modelService: IModelService,
		@NexFileSystem fileSystem: NexFileSystem,
		@NexClipboard clipboard: NexClipboard,
	) {
		this.app = createApp(modeService, modelService, fileSystem, clipboard);
	}

	public renderApp(target: HTMLElement) {
		this.app.renderApp(target);
	}
}
