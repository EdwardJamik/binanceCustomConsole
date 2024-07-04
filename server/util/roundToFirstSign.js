function roundDecimal(number) {
    let integerPart = Math.trunc(number);

    let fractionalPart = number - integerPart;

    if (fractionalPart !== 0 && integerPart === 0) {
        let factor = 1;
        while (fractionalPart * factor < 1) {
            factor *= 10;
        }
        fractionalPart = Math.ceil(fractionalPart * factor) / factor;
    }

    if (integerPart === 0)
        return `${integerPart + fractionalPart}`;
    else
        return `${integerPart}`;

}

exports.roundDecimal = roundDecimal