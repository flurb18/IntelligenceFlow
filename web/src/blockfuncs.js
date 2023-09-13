export function execInputBlock(input, blockData, resolve, reject) {
    resolve(input);
}

export function execInputFixedBlock(input, blockData, resolve, reject) {
    resolve(input);
}

export function execOutputBlock(input, blockData, resolve, reject) {
    document.getElementById(blockData.id + "-output").value = input;
    resolve();
}

export function execCopyBlock(input, blockData, resolve, reject) {
    var numCopies = blockData.parameters["COPY-num-copies"];
    resolve(Array(numCopies).fill(input));
}

export function execSplitBlock(input, blockData, resolve, reject) {
    resolve(input);
}

export function execCombineBlock(input, blockData, resolve, reject) {
    resolve(input.join(" "));
}

export function execLLMBlock(input, blockData, resolve, reject) {
    resolve(input);
}