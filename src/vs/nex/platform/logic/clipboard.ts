import { Emitter, Event } from 'vs/base/common/event';
import { URI } from 'vs/base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IClipboardService } from 'vs/platform/clipboard/common/clipboardService';

export const NexClipboard = createDecorator<NexClipboard>('nexClipboard');

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type NexClipboard = Pick<IClipboardService, 'readResources' | 'writeResources'> & {
	_serviceBrand: undefined;

	onClipboardChanged: Event<void>;
};

export class NexClipboardImpl implements NexClipboard {
	public _serviceBrand: undefined;
	private readonly _onClipboardChanged = new Emitter<void>();

	public constructor(@IClipboardService private readonly clipboardService: IClipboardService) {}

	public readResources = () => {
		return this.clipboardService.readResources();
	};

	public writeResources: (resources: URI[]) => Promise<void> = async (...args) => {
		await this.clipboardService.writeResources(...args);
		this._onClipboardChanged.fire();
	};

	public onClipboardChanged = this._onClipboardChanged.event;
}

registerSingleton(NexClipboard, NexClipboardImpl);
