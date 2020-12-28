import { byteSize, ByteUnit } from 'vs/nex/base/utils/byte-size.util';
import { numbers } from 'vs/nex/base/utils/numbers.util';
import { i18n } from 'vs/nex/base/domain/i18n';

export const formatter = { bytes };

function bytes(numberOfBytes: number, options?: { unit: ByteUnit }): string {
	let unitToUse = options?.unit;
	if (unitToUse === undefined) {
		unitToUse = byteSize.probe(numberOfBytes).unit;
	}

	const formattedNumber = numbers
		.roundToDecimals(byteSize.transform(numberOfBytes, unitToUse), 2)
		.toLocaleString(i18n.locale, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	return `${formattedNumber} ${unitToUse}`;
}
