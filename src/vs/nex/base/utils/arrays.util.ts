// https://github.com/basarat/algorithms/blob/master/src/mergeSort/mergeSort.ts

/**
 * Sorts an array using merge sort
 */
export function mergeSort<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
	if (array.length <= 1) {
		return array;
	}
	const middle = Math.floor(array.length / 2);
	const left = array.slice(0, middle);
	const right = array.slice(middle);

	return merge(mergeSort(left, compareFn), mergeSort(right, compareFn), compareFn);
}

/** Merge (conquer) step of mergeSort */
function merge<T>(left: T[], right: T[], compareFn: (a: T, b: T) => number): T[] {
	const array: T[] = [];
	let lIndex = 0;
	let rIndex = 0;
	while (lIndex + rIndex < left.length + right.length) {
		const lItem = left[lIndex];
		const rItem = right[rIndex];
		if (lItem === undefined) {
			array.push(rItem);
			rIndex++;
		} else if (rItem === undefined) {
			array.push(lItem);
			lIndex++;
		} else if (compareFn(lItem, rItem) <= 0) {
			array.push(lItem);
			lIndex++;
		} else {
			array.push(rItem);
			rIndex++;
		}
	}
	return array;
}
