import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { removeElement, insertBefore } from "./utils.js";
import { apiFuncs } from "./apifuncs.js";

export var blockFuncs = {
    "INPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve(input);
        },
        create: function (blockData) {
            var inputIdString = blockData.id + "-input";
            var inputElement = document.createElement("textarea");
            inputElement.setAttribute("id", inputIdString);
            inputElement.setAttribute("name", inputIdString);
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", inputIdString);
            labelElement.setAttribute("id", inputIdString + "-label");
            labelElement.innerText = blockData.label;
            var submitButton = document.getElementById("execute-form-submit");
            insertBefore(labelElement, submitButton);
            insertBefore(inputElement, submitButton);
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {
            var inputIdString = blockData.id + "-input";
            removeElement(document.getElementById(inputIdString));
            removeElement(document.getElementById(inputIdString + "-label"));
        }
    },
    "INPUT-FIXED": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve(input);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "OUTPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            document.getElementById(blockData.id + "-output").value = input;
            resolve();
        },
        create: function (blockData) {
            var outputIdString = blockData.id + "-output";
            var outputElement = document.createElement("textarea");
            outputElement.setAttribute("id", outputIdString);
            outputElement.setAttribute("name", outputIdString);
            outputElement.readOnly = true;
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", outputIdString);
            labelElement.setAttribute("id", outputIdString + "-label");
            labelElement.innerText = blockData.label;
            var outputDiv = document.getElementById("output-div");
            outputDiv.appendChild(labelElement);
            outputDiv.appendChild(outputElement);
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {
            var outputIdString = blockData.id + "-output";
            removeElement(document.getElementById(outputIdString));
            removeElement(document.getElementById(outputIdString + "-label"));
        }
    },
    "COPY": {
        exec: function (input, blockData, state, resolve, reject) {
            var numCopies = parseInt(blockData.parameters["COPY-num-copies"]);
            resolve(Array(numCopies).fill(input));
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "SPLIT": {
        exec: function (input, blockData, state, resolve, reject) {
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: blockData.parameters["SPLIT-chunk-size"],
                chunkOverlap: blockData.parameters["SPLIT-chunk-overlap"]
            });
            splitter.createDocuments([input]).then((docs) => {
                output = []
                for (var doc of docs) {
                    output.push(doc.pageContent);
                }
                resolve(output);
            }).catch((error) => { reject(error); });
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "COMBINE": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve(input.join(" "));
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "LLM": {
        exec: function (input, blockData, state, resolve, reject) {
            var prompt = blockData.parameters["LLM-query"].replace("_INPUT_", input);
            if (!Object.keys(apiFuncs).includes(state.apiType)) {
                reject("API error");
            }
            apiFuncs[state.apiType](prompt, state.apiParams).then((output) => {
                resolve(output);
            }).catch((error) => {
                reject("API error");
                console.log(error);
            });
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "SYNTHESIZE": {
        exec: function (input, blockData, state, resolve, reject) {
            reject("This block is a container and shouldn't ever run");
        },
        create: function (blockData) {
            var elements = [{ group: 'nodes', data: blockData }];
            var outputId = blockData.id + "OUTPUT";
            var inputIds = []
            for (var i = 1; i <= blockData.parameters["SYNTHESIZE-num-inputs"]; i++) {
                var inputId = blockData.id + "INPUT" + i;
                inputIds.push(inputId);
                elements.push({
                    group: 'nodes',
                    data: {
                        "id": inputId,
                        "parent": blockData.id,
                        "label": blockData.label + "-INPUT" + i,
                        "block-type": "SYNTHESIZE-INPUT",
                        "input-type": "none",
                        "parameters": blockData.parameters,
                        "waits-for": []
                    }
                });
                elements.push({
                    group: 'edges',
                    data: {
                        "id": inputId + outputId,
                        "source": inputId,
                        "target": outputId,
                        "user-created": false
                    }
                });
            }
            var output = {
                group: 'nodes',
                data: {
                    "id": outputId,
                    "parent": blockData.id,
                    "label": blockData.label + "-OUTPUT",
                    "block-type": "SYNTHESIZE-OUTPUT",
                    "input-type": "single",
                    "parameters": blockData.parameters,
                    "waits-for": inputIds
                },
                scratch: {
                    "waiting-for": [...inputIds],
                    "queued-inputs": {}
                }
            };
            return [...elements, output];
        },
        destroy: function (blockData) {

        }
    },
    "SYNTHESIZE-INPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve(input);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "SYNTHESIZE-OUTPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            var output = blockData.parameters["SYNTHESIZE-output-format"];
            for (var i = 1; i <= blockData.parameters["SYNTHESIZE-num-inputs"]; i++) {
                output = output.replace("_INPUT" + i + "_", input[blockData.parent + "INPUT" + i]);
            }
            resolve(output);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "REGEX": {
        exec: function (input, blockData, state, resolve, reject) {
            var regex = new RegExp(blockData.parameters["REGEX-regex"], "g");
            resolve(input.match(regex));
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    }
};