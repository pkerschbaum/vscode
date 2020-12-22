/* eslint-disable no-console */
/* tslint:disable no-console */

import { CustomError } from 'vs/nex/base/custom-error';
import { JsonObject } from 'vs/nex/base/utils/types.util';
import { objects } from 'vs/nex/base/utils/objects.util';

type Logger = {
	debug: (message: string, logPayload?: JsonObject, verboseLogPayload?: JsonObject) => void;
	info: (message: string, logPayload?: JsonObject, verboseLogPayload?: JsonObject) => void;
	warn: (message: string, logPayload?: JsonObject, verboseLogPayload?: JsonObject) => void;
	error: (
		message: string,
		error?: any,
		logPayload?: JsonObject,
		verboseLogPayload?: JsonObject,
	) => void;
	group: (groupName: string) => void;
	groupEnd: () => void;
};

export function createLogger(context: string): Logger {
	function extendLog(message: string, logPayload?: JsonObject, verboseLogPayload?: JsonObject) {
		// if CustomErrors get passed in a payload, extract the data prop of the error and
		// append it to the payload
		let customLogPayload = objects.shallowCopy(logPayload);
		if (customLogPayload !== undefined) {
			for (const [prop, value] of Object.entries(customLogPayload)) {
				if (value instanceof CustomError) {
					customLogPayload[`${prop}_errorData`] = value.data;
				}
			}
		}
		let customVerboseLogPayload = objects.shallowCopy(verboseLogPayload);
		if (customVerboseLogPayload !== undefined) {
			for (const [prop, value] of Object.entries(customVerboseLogPayload)) {
				if (value instanceof CustomError) {
					customVerboseLogPayload[`${prop}_errorData`] = value.data;
				}
			}
		}

		return {
			message: `[${context}] ${message}`,
			logPayload: customLogPayload,
			verboseLogPayload: customVerboseLogPayload,
		};
	}

	return {
		debug: (...args) => {
			const extendedLog = extendLog(...args);

			const additionalParams: any[] = [];
			if (extendedLog.logPayload !== undefined) {
				additionalParams.push(extendedLog.logPayload);
			}
			if (extendedLog.verboseLogPayload !== undefined) {
				additionalParams.push(extendedLog.verboseLogPayload);
			}
			console.debug(extendedLog.message, ...additionalParams);
		},
		info: (...args) => {
			const extendedLog = extendLog(...args);

			const additionalParams: any[] = [];
			if (extendedLog.logPayload !== undefined) {
				additionalParams.push(extendedLog.logPayload);
			}
			if (extendedLog.verboseLogPayload !== undefined) {
				additionalParams.push(extendedLog.verboseLogPayload);
			}
			console.info(extendedLog.message, ...additionalParams);
		},
		warn: (...args) => {
			const extendedLog = extendLog(...args);

			const additionalParams: any[] = [];
			if (extendedLog.logPayload !== undefined) {
				additionalParams.push(extendedLog.logPayload);
			}
			if (extendedLog.verboseLogPayload !== undefined) {
				additionalParams.push(extendedLog.verboseLogPayload);
			}
			console.warn(extendedLog.message, ...additionalParams);
		},
		error: (
			message: string,
			error?: any,
			logPayload?: JsonObject,
			verboseLogPayload?: JsonObject,
		) => {
			const extendedLog = extendLog(message, logPayload, verboseLogPayload);

			const additionalParams: any[] = [];
			if (extendedLog.logPayload !== undefined) {
				additionalParams.push(extendedLog.logPayload);
			}
			if (extendedLog.verboseLogPayload !== undefined) {
				additionalParams.push(extendedLog.verboseLogPayload);
			}
			console.error(extendedLog.message, error, ...additionalParams);
		},
		group: console.group,
		groupEnd: console.groupEnd,
	};
}
