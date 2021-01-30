import { ObjectLiteral, IsJsonable } from 'vs/nex/base/utils/types.util';

export const objects = {
	isEmpty,
	isNullish,
	isNotNullish,
	undefinedIfEmpty,
	shallowCopy,
	deepCopyJson,
};

function isEmpty(obj: ObjectLiteral) {
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			return false;
		}
	}
	return true;
}

function isNullish<T>(obj: T | undefined | null): obj is undefined | null {
	return obj === undefined || obj === null;
}

function isNotNullish<T>(obj: T | undefined | null): obj is T {
	return !isNullish(obj);
}

function undefinedIfEmpty(obj: ObjectLiteral) {
	if (isEmpty(obj)) {
		return undefined;
	}
	return obj;
}

function shallowCopy<T>(inObject: T): T {
	if (typeof inObject !== 'object' || inObject === null) {
		return inObject; // Return the value if inObject is not an object
	} else {
		// shallow copy via object spread
		return { ...inObject };
	}
}

function deepCopyJson<T>(inObj: IsJsonable<T>): IsJsonable<T> {
	return JSON.parse(JSON.stringify(inObj));
}
