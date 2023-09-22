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
    "FIXED-INPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve([{done: true, output: blockData.parameters["FIXED-INPUT-text"]}]);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "OUTPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            document.getElementById(blockData.id + "-output").value += input+"\n";
            resolve([]);
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
            var buttonElement = document.createElement("button");
            buttonElement.setAttribute("id", outputIdString+"-clear-button");
            buttonElement.setAttribute("class", "sidebar-button");
            buttonElement.innerText = "Clear "+ blockData.label;
            buttonElement.addEventListener("click", function (e) {
                outputElement.value = "";
            });
            var outputDiv = document.getElementById("output-div");
            outputDiv.appendChild(labelElement);
            outputDiv.appendChild(outputElement);
            outputDiv.appendChild(buttonElement);
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {
            var outputIdString = blockData.id + "-output";
            removeElement(document.getElementById(outputIdString));
            removeElement(document.getElementById(outputIdString + "-label"));
            removeElement(document.getElementById(outputIdString + "-clear-button"));
        }
    },
    "FORWARD":{
        exec: function(input, blockData, state, resolve, reject) {
            resolve([{done:true, output:input}]);
        },
        create: function(blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function(blockData) {

        }
    },
    "SAVE": {
        exec: function(input, blockData, state, resolve, reject) {
            if (!blockData.hasOwnProperty("save")) {
                blockData["save"] = input;
            }
            if (!blockData["save"]) {
                blockData["save"] = input;
            }
            resolve([{done: true, output: blockData["save"]}]);
        },
        create: function(blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function(blockData) {

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
            const breaks = ['\n', '.', ',',' '];

            function findBreakPos(str, center_idx, search_radius) {
                var breakingPos = -1;
                if (center_idx < 0) {
                    center_idx = 0;
                }
                for (var breakingChar of breaks) {
                    for (var r = 0; r < search_radius; r++) {
                        if (center_idx + r < str.length) {
                            if (str.substring(center_idx + r, center_idx + r + 1) === breakingChar) {
                                breakingPos = center_idx + r + 1;
                                break;
                            }
                        }
                        if (center_idx - r >= 0) {
                            if (str.substring(center_idx - r, center_idx - r + 1) === breakingChar) {
                                breakingPos = center_idx - r + 1;
                                break;
                            }
                        }
                    }
                    if (breakingPos > 0) {
                        break;
                    }
                }
                if (breakingPos < 0) {
                    breakingPos = Math.min(str.length, center_idx);
                }
                return breakingPos;
            }

            var _output = [];
            var remaining = input;
            const c_size = parseInt(blockData.parameters["SPLIT-chunk-size"]);
            const c_overlap = parseInt(blockData.parameters["SPLIT-chunk-overlap"]);
            const c_deviation = parseInt(blockData.parameters["SPLIT-chunk-deviation"]);
            var breakingPos = -1;
            var breakingPos = c_size;

            while (remaining) {
                var breakpoint = findBreakPos(remaining, c_size, c_deviation);
                _output.push(remaining.substring(0, breakpoint));
                var laggingBreakpoint = findBreakPos(remaining, breakpoint - c_overlap, c_deviation);
                remaining = remaining.substring(laggingBreakpoint, remaining.length);
            }
            resolve([{done: true, output: _output}]);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "COMBINE": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve([{done: true, output: input.join("\n\n")}]);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "SEPARATE": {
        exec: function (input, blockData, state, resolve, reject) {
            reject("This block is a container and shouldn't ever run");
        },
        create: function (blockData) {
            var inputId = blockData.id + "INPUT";
            var elements = [
                { group: 'nodes', data: blockData },
                { 
                    group: 'nodes',
                    data: {
                        "id": inputId,
                        "parent": blockData.id,
                        "label": blockData.label + "-INPUT",
                        "block-type": "SEPARATE-INPUT",
                        "input-type": "none",
                        "parameters": blockData.parameters,
                        "waits-for": []
                    }
                }
            ];
            for (var i = 1; i <= blockData.parameters["SEPARATE-num-outputs"]; i++) {
                var outputId = blockData.id + "OUTPUT" + i;
                elements.push({
                    group: "nodes",
                    data: {
                        "id": outputId,
                        "parent": blockData.id,
                        "label": blockData.label + "-OUTPUT" + i,
                        "block-type": "SEPARATE-OUTPUT",
                        "input-type": "unavailable",
                        "parameters": blockData.parameters,
                        "waits-for": []
                    }
                });
                elements.push({
                    group: "edges",
                    data: {
                        "id": inputId + outputId,
                        "source": inputId,
                        "target": outputId,
                        "user-created": false
                    }
                });
            }
            return elements;
        },
        destroy: function (blockData) {

        }
    },
    "SEPARATE-INPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            var _output = [];
            for (var i = 1; i <= Math.min(blockData.parameters["SEPARATE-num-outputs"], input.length); i++) {
                _output.push({
                    done: true,
                    output: input[i-1],
                    for: blockData.parent + "OUTPUT" + i
                });
            }
            resolve(_output);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "SEPARATE-OUTPUT": {
        exec: function (input, blockData, state, resolve, reject) {
            resolve([{done:true, output: input}]);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "EMIT": {
        exec: function (input, blockData, state, resolve, reject) {
            var _output = [];
            for (var inp of input) {
                _output.push({done:true, output: inp});
            }
            resolve(_output);
        },
        create: function (blockData) {
            return [{ group: 'nodes', data: blockData }];
        },
        destroy: function (blockData) {

        }
    },
    "LLM": {
        exec: function (input, blockData, state, resolve, reject) {
            function apiCall(_input) {
                var _prompt = blockData.parameters["LLM-query"].replace("_INPUT_", _input);
                var request = {
                    type: state.apiType,
                    prompt: _prompt,
                    temperature: blockData.parameters["LLM-temperature"],
                    max_new_tokens: blockData.parameters["LLM-max-new-tokens"]
                };
                return fetch("api/llm", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(request)
                }).then((response) => response.json()).then((responseJSON) => {
                    if (responseJSON.hasOwnProperty("error") || !responseJSON.hasOwnProperty("output")) {
                        reject("API Error");
                        console.log(responseJSON["error"]);
                    } else {
                        resolve([{done: true, output: responseJSON["output"]}])
                    }
                }).catch((error) => {
                    reject("API Error");
                    console.log(error);
                });
                /*
                apiFuncs[state.apiType](prompt, blockData.parameters, state).then((_output) => {
                    resolve([{ done: true, output: _output }]);
                }).catch((error) => {
                    reject("API error");
                    console.log(error);
                });*/
            }
            apiCall(input);
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
            elements.push({
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
            });
            return elements;
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
            var _output = [];
            for (var i = 1; i <= n_groups; i++) {
                var matches = [...input.matchAll(regex)];
                var groupOutput = [];
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