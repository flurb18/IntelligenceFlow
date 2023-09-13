export var blockFuncs = {
    "INPUT": execInputBlock,
    "INPUT-FIXED": execInputFixedBlock,
    "OUTPUT": execOutputBlock,
    "COPY": execCopyBlock,
    "SPLIT": execSplitBlock,
    "COMBINE": execCombineBlock,
    "LLM": execLLMBlock
};

function execInputBlock(input, blockData, resolve, reject) {
    resolve(input);
}

function execInputFixedBlock(input, blockData, resolve, reject) {
    resolve(input);
}

function execOutputBlock(input, blockData, resolve, reject) {
    document.getElementById(blockData.id + "-output").value = input;
    resolve();
}

function execCopyBlock(input, blockData, resolve, reject) {
    var numCopies = blockData.parameters["COPY-num-copies"];
    resolve(Array(numCopies).fill(input));
}

function execSplitBlock(input, blockData, resolve, reject) {
    resolve(input);
}

function execCombineBlock(input, blockData, resolve, reject) {
    resolve(input.join(" "));
}

function execLLMBlock(input, blockData, resolve, reject) {
    resolve(input);
}