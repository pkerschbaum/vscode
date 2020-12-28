export const numbers = {
	roundToDecimals,
};

// like https://stackoverflow.com/a/11832950/1700319, but we use Math.floor to round down
function roundToDecimals(num: number, countOfDecimals: number): number {
	const factor = Math.pow(10, countOfDecimals);
	return Math.floor((num + Number.EPSILON) * factor) / factor;
}
