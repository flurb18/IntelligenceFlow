import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { removeElement, insertBefore, notify } from "./utils.js";
import { apiFuncs } from "./apifuncs.js";

export var blockFuncs = {
    "INPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve([{done:true, output: input}]);
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
            resolve([{done: true, output: input}]);
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
            resolve([{done:true, output: Array(numCopies).fill(input)}]);
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
                _output = []
                for (var doc of docs) {
                    _output.push(doc.pageContent);
                }
                resolve([{done: true, output: _output}]);
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
            resolve([{done: true, output: input.join(" ")}]);
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
            apiFuncs[state.apiType](prompt, state.apiParams).then((_output) => {
                resolve([{done: true, output: _output}]);
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
                    "input-type": "unavailable",
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
            resolve([{done: true, output: input}]);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "SYNTHESIZE-OUTPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            var _output = blockData.parameters["SYNTHESIZE-output-format"];
            for (var i = 1; i <= blockData.parameters["SYNTHESIZE-num-inputs"]; i++) {
                _output = _output.replace("_INPUT" + i + "_", input[blockData.parent + "INPUT" + i]);
            }
            resolve([{done:true, output:_output}]);
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
            var res = input.match(regex);
            if (res) {
                resolve([{done: true, output:res}]);
            } else {
                resolve([{done: true, output:[]}]);
            }
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "REGEX-CAPTURE": {
        exec: function (input, blockData, state, resolve, reject) {
            reject("This block is a container and shouldn't ever run");
        },
        create: function(blockData) {
            var n_groups = (new RegExp(blockData.parameters["REGEX-CAPTURE-regex"] + '|')).exec('').length - 1;
            if (n_groups === 0) {
                notify("Regex must contain at least one capture group.");
                return [];
            }
            var inputId = blockData.id + "INPUT";
            var elements = [
                { group: 'nodes', data: blockData },
                {
                    group: 'nodes',
                    data: {
                        "id": inputId,
                        "parent": blockData.id,
                        "label": blockData.label + "-INPUT",
                        "block-type": "REGEX-CAPTURE-INPUT",
                        "input-type": "none",
                        "parameters": blockData.parameters,
                        "waits-for": []
                    }
                }
            ];
            for (var i = 1; i <= n_groups; i++) {
                var outputId = blockData.id + "OUTPUT" + i;
                elements.push({
                    group: 'nodes',
                    data: {
                        "id": outputId,
                        "parent": blockData.id,
                        "label": blockData.label + "-OUTPUT" + i,
                        "block-type": "REGEX-CAPTURE-OUTPUT",
                        "input-type": "unavailable",
                        "parameters": blockData.parameters,
                        "waits-for": []
                    }
                });
                elements.push({
                    group: 'edges',
                    data: {
                        "id": inputId + outputId,
                        "source": inputId,
                        "target": outputId
                    }
                })
            }
            return elements;
        },
        destroy: function (blockData) {

        }
    },
    "REGEX-CAPTURE-INPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            var n_groups = (new RegExp(blockData.parameters["REGEX-CAPTURE-regex"] + '|')).exec('').length - 1;
            var regex = new RegExp(blockData.parameters["REGEX-CAPTURE-regex"], "g");
            _output = [];
            for (var i = 1; i <= n_groups; i++) {
                var matches = input.match_all(regex);
                groupOutput = [];
                matches.forEach((match) => {
                    groupOutput.push(match[i]);
                });
                _output.push({
                    done: true,
                    output: groupOutput,
                    for: blockData.parent + "OUTPUT" + i 
                });
            }
            resolve(_output);
        },
        create: function(blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "REGEX-CAPTURE-OUTPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve([{done: true, output: input}]);
        },
        create: function(blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    }
};