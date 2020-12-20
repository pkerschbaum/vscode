/**
 * Similar to Object.values of ES2017, but not spec-compliant (does not check if property is enumerable, among other things).
 *
 * Returns an array of values of the properties of an object
 * @param obj Object that contains the properties and methods.
 */
export function propsToArray<T>(obj: { [s: string]: T }): T[] {
	return Object.keys(obj).map(i => obj[i]);
}
