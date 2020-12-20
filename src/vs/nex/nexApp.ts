import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { createApp } from 'vs/nex/index';
import { NexFileSystem } from 'vs/nex/platform/logic/file-system';

export class NexApp {
	private app: ReturnType<typeof createApp>;

	public constructor(
		@IModeService modeService: IModeService,
		@IModelService modelService: IModelService,
		@NexFileSystem fileSystem: NexFileSystem
	) {
		this.app = createApp(modeService, modelService, fileSystem);
	}

	public renderApp(target: HTMLElement) {
		this.app.renderApp(target);
	}
}
