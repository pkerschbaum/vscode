import { matchSorter, MatchSorterOptions } from 'match-sorter';

import * as vsArraysUtils from 'vs/base/common/arrays';

export const arrays = {
	isNullishOrEmpty,
	stableSort: vsArraysUtils.mergeSort,
	uniqueValues,
	shallowCopy,
	pickElementAndRemove,
	wrap,
};

function isNullishOrEmpty(arr: Array<any> | undefined | null): boolean {
	return arr === undefined || arr === null || arr.length === 0;
}

function uniqueValues<T>(array: T[]): T[] {
	return [...new Set(array)] as T[];
}

function shallowCopy<T>(array: T[]): T[] {
	return array.slice();
}

function pickElementAndRemove<T>(array: T[], elementIndex: number): T | undefined {
	const elementArray = array.splice(elementIndex, 1);
	if (elementArray.length === 0) {
		return undefined;
	}
	return elementArray[0];
}

function wrap<T>(array: T[]) {
	let currentVal = array;
	const wrapper = {
		stableSort: (compareFn: (a: T, b: T) => number) => {
			currentVal = vsArraysUtils.mergeSort(currentVal, compareFn);
			return wrapper;
		},
		matchSort: (value: string, options?: MatchSorterOptions<T>) => {
			currentVal = matchSorter(currentVal, value, options);
			return wrapper;
		},
		shallowCopy: () => {
			currentVal = shallowCopy(currentVal);
			return wrapper;
		},
		pickElementAndRemove: (elementIndex: number) => {
			return pickElementAndRemove(currentVal, elementIndex);
		},
		getValue: () => currentVal,
	};
	return wrapper;
}
