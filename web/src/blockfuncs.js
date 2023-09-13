export var blockFuncs = {
    "INPUT": function (input, blockData, resolve, reject) {
        resolve(input);
    },
    "INPUT-FIXED": function (input, blockData, resolve, reject) {
        resolve(input);
    },
    "OUTPUT": function (input, blockData, resolve, reject) {
        document.getElementById(blockData.id + "-output").value = input;
        resolve();
    },
    "COPY": function (input, blockData, resolve, reject) {
        var numCopies = blockData.parameters["COPY-num-copies"];
        resolve(Array(numCopies).fill(input));
    },
    "SPLIT": function (input, blockData, resolve, reject) {
        resolve(input);
    },
    "COMBINE": function (input, blockData, resolve, reject) {
        resolve(input.join(" "));
    },
    "LLM": function (input, blockData, resolve, reject) {
        resolve(input);
    }
};