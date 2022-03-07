function gaussian(size: number) {
    let out: Array<number> = []
    let peakPos = 0.5;
    let stdDev = 0.3;
    for(let i = 0; i <= size; i++) {
        let x = 1 / size * i;
        let value = Math.E ** ((- ((x - peakPos) ** 2) / (2 * (stdDev ** 2)))
        out.push(value);
    }

    return out
}


//// Return weighted towards the middle
export function gaussianAverage(data: Array<number>, maxValue: number): number {
    let weights = gaussian(data.length);
    let total = 0;
    let maxTotal = 0
    for (let i = 0; i < data.length; i++) {
        total += data[i] * weights[i];
        maxTotal += maxValue * weights[i];
    }
    return total / data.length;
}