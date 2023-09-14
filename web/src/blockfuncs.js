import { insertBefore } from "./utils.js";

export var blockFuncs = {
    "INPUT": {
        exec: function (input, blockData, srcId, resolve, reject) {
            resolve(input);
            return {};
        },
        create: function(blockData) {
            var inputIdString = blockData.id + "-input";
            var inputElement = document.createElement("textarea");
            inputElement.setAttribute("id", inputIdString);
            inputElement.setAttribute("name", inputIdString);
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", inputIdString);
            labelElement.innerText = blockData.label;
            var submitButton = document.getElementById("execute-form-submit");
            insertBefore(labelElement, submitButton);
            insertBefore(inputElement, submitButton);
            insertBefore(document.createElement("br"), submitButton);
            return [];
        },
        destroy: function(blockData) {

        }
    },
    "INPUT-FIXED": {
        exec: function (input, blockData, srcId, resolve, reject) {
            resolve(input);
            return {};
        },
        create: function(blockData) {
            return [];
        },
        destroy: function(blockData) {
            
        }
    },
    "OUTPUT": {
        exec: function (input, blockData, srcId, resolve, reject) {
            document.getElementById(blockData.id + "-output").value = input;
            resolve();
            return {};
        },
        create: function(blockData) {
            var outputIdString = blockData.id + "-output";
            var outputElement = document.createElement("textarea");
            outputElement.setAttribute("id", outputIdString);
            outputElement.setAttribute("name", outputIdString);
            outputElement.readOnly = true;
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", outputIdString);
            labelElement.innerText = blockData.label;
            var outputDiv = document.getElementById("output-div");
            outputDiv.appendChild(labelElement);
            outputDiv.appendChild(outputElement);
            outputDiv.appendChild(document.createElement("br"));
            return [];
        },
        destroy: function(blockData) {
            
        }
    },
    "COPY": {
        exec: function (input, blockData, srcId, resolve, reject) {
            var numCopies = blockData.parameters["COPY-num-copies"];
            resolve(Array(numCopies).fill(input));
            return {};
        },
        create: function(blockData) {
            return [];
        },
        destroy: function(blockData) {
            
        }
    },
    // TODO
    "SPLIT": {
        exec: function (input, blockData, srcId, resolve, reject) {
            resolve(input);
            return {};
        },
        create: function(blockData) {
            return [];
        },
        destroy: function(blockData) {
            
        }
    },
    "COMBINE": {
        exec: function (input, blockData, srcId, resolve, reject) {
            resolve(input.join(" "));
            return {};
        },
        create: function(blockData) {
            return [];
        },
        destroy: function(blockData) {
            
        }
    },
    "LLM": {
        exec: function (input, blockData, srcId, resolve, reject) {
            resolve(input);
            return {};
        },
        create: function(blockData) {
            return [];
        },
        destroy: function(blockData) {
            
        }
    },
    "SYNTHESIZE": {
        exec: function (input, blockData, srcId, resolve, reject) {
            reject("This block is a container and shouldn't ever run");
            return {};
        },
        create: function(blockData) {
            var inputs = [];
            var edges = [];
            var outputId = blockData.id + "OUTPUT";
            var output = {
                group: 'nodes',
                data: {
                    "id": outputId,
                    "parent": blockData.id,
                    "label": blockData.label + "-OUTPUT",
                    "block-type": "SYNTHESIZE-OUTPUT",
                    "input-type": "none",
                    "parameters": blockData.parameters,
                    "inputs-received": {}
                }
            };
            for (var i = 1; i <= blockData.parameters["SYNTHESIZE-num-inputs"]; i++) {
                var inputId = blockData.id + "INPUT" + i
                inputs.push({
                    group: 'nodes',
                    data: {
                        "id": inputId,
                        "parent": blockData.id,
                        "label": blockData.label + "-INPUT" + i,
                        "block-type": "SYNTHESIZE-INPUT",
                        "input-type": "none",
                        "parameters": blockData.parameters
                    }
                });
                edges.push({
                    group: 'edges',
                    data: {
                        "id": inputId + outputId,
                        "source": inputId,
                        "target": outputId
                    }
                })
            }
            
            return [...inputs, output, ...edges]
        },
        destroy: function(blockData) {
            
        }
    },
    "SYNTHESIZE-INPUT": {
        exec: function (input, blockData, srcId, resolve, reject) {
            resolve(input);
            return {};
        },
        create: function(blockData) {
            return [];
        },
        destroy: function(blockData) {
            
        }
    },
    "SYNTHESIZE-OUTPUT": {
        exec: function (input, blockData, srcId, resolve, reject) {
            var newData = blockData["inputs-received"];
            newData[srcId] = input;
            if (Object.keys(newData).length == blockData.parameters["SYNTHESIZE-num-inputs"]) {
                output = blockData.parameters["SYNTHESIZE-output-format"];
                for (var i = 1; i <= blockData.parameters["SYNTHESIZE-num-inputs"]; i++) {
                    output = output.replace("_INPUT"+ i +"_", newData[blockData.parent + "INPUT" + i]);
                }
                resolve(output);
                return {
                    "inputs-received": {}
                };
            } else {
                reject("NOTREADY");
                return {
                    "inputs-received": newData
                };
            }
        },
        create: function(blockData) {
            return [];
        },
        destroy: function(blockData) {
            
        }
    }
};