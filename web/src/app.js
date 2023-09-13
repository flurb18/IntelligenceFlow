import { insertAfter, insertBefore, createSubmenusByType } from './utils.js';

// Make sidebar expand buttons work
var expands = document.getElementsByClassName("sidebar-submenu-expand-button");
for (var i = 0; i < expands.length; i++) {
    expands[i].addEventListener("click", function (e) {
        e.preventDefault();
        this.classList.toggle("sidebar-submenu-expand-button-active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });
}

// Prevent enter from submitting forms
var forms = document.getElementsByClassName("sidebar-submenu-expand");
for (var form of forms) {
    form.addEventListener('keypress', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const blockTypesPromise = fetch("/src/blocktypes.json").then(response => response.json());
    const apiTypesPromise = fetch("/src/apitypes.json").then(response => response.json());
    const cytostylePromise = fetch("/styles/cytoscape-styles.json").then(response => response.json());

    Promise.all([blockTypesPromise, apiTypesPromise, cytostylePromise]).then(
        function (responses) {
            let blockTypes = responses[0];
            let apiTypes = responses[1];
            let cytostyle = responses[2];
            // Create block type submenus
            createSubmenusByType(blockTypes, document.getElementById("new-block-type"));
            createSubmenusByType(apiTypes, document.getElementById("api-settings-type"));
            // Create the cytoscape
            main(blockTypes, apiTypes, cytostyle);
        }
    );
});

function main(blockTypes, apiTypes, cytostyle) {
    // Run Cytoscape
    const cy = cytoscape({
        container: document.getElementById('flow-diagram'),
        zoom: 1,
        minZoom: 0.5,
        maxZoom: 2,
        elements: [],
        style: cytostyle,
        layout: { name: 'grid' }
    });

    var selectedNode = null;
    cy.on('cxttap', function (event) {
        if (event.target === cy) {
            if (selectedNode) {
                selectedNode.toggleClass("selected");
                selectedNode = null;
            }
        } else {
            if (event.target.isNode()) {
                if (selectedNode) {
                    if (!(selectedNode === event.target)) {
                        var srcBlockType = selectedNode.data("block-type");
                        var destBlockType = event.target.data("block-type");
                        var srcOutputTypes = blockTypes[srcBlockType]["maps"][selectedNode.data("input-type")];
                        if (srcOutputTypes.length === 1) {
                            var srcOutputType = srcOutputTypes[0];
                            var destAssignedInputType = event.target.data("input-type");
                            var destAvailableInputTypes = Object.keys(blockTypes[destBlockType]["maps"]);
                            if (!(srcOutputType === "none") && (
                                (destAssignedInputType === srcOutputType) ||
                                (destAssignedInputType === "none" && destAvailableInputTypes.includes(srcOutputType))
                            )
                            ) {
                                var _classes = []
                                if (srcOutputType === "multi") {
                                    _classes.push("multi")
                                }
                                cy.add([{
                                    "group": 'edges',
                                    "data": {
                                        "id": selectedNode.id() + event.target.id(),
                                        "source": selectedNode.id(),
                                        "target": event.target.id(),
                                        "flow-type": srcOutputType
                                    },
                                    "classes": _classes
                                }]);
                                event.target.data("input-type", srcOutputType);
                            }
                        }
                        selectedNode.toggleClass("selected");
                        selectedNode = null;
                    }
                } else {
                    selectedNode = event.target;
                    selectedNode.toggleClass("selected");
                }
            }
        }
    });

    var blockTypeIdNums = {}
    for (var blockType of Object.keys(blockTypes)) {
        blockTypeIdNums[blockType] = [0];
    }

    // Handle new block form submission
    var newBlockForm = document.getElementById("new-block-form");
    newBlockForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var extent = cy.extent();
        var blockType = newBlockForm.elements["new-block-type"].value;
        var newId = Math.max(...blockTypeIdNums[blockType]) + 1;
        var idString = blockType + newId;
        var inputLabel = newBlockForm.elements["new-block-label"].value;
        var label = inputLabel ? idString + "-" + inputLabel : idString;
        var _data = {
            "id": idString,
            "label": label,
            "block-type": blockType,
            "input-type": "none",
            "parameters": {}
        };
        blockTypeIdNums[blockType].push(newId);
        for (var param of Object.keys(blockTypes[blockType]["parameters"])) {
            _data["parameters"][param] = newBlockForm.elements[param].value;
        }
        var maxD = Math.floor(Math.min(extent.w, extent.h) / 6);
        cy.add([{
            group: 'nodes',
            data: _data,
            position: {
                x: ((extent.x1 + extent.x2) / 2) + Math.floor(Math.random() * 2 * maxD) - maxD,
                y: ((extent.y1 + extent.y2) / 2) + Math.floor(Math.random() * 2 * maxD) - maxD
            }
        }]);
        if (blockType === "INPUT") {
            var inputIdString = idString + "-input";
            var inputElement = document.createElement("textarea");
            inputElement.setAttribute("id", inputIdString);
            inputElement.setAttribute("name", inputIdString);
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", inputIdString);
            labelElement.innerText = label;
            var submitButton = document.getElementById("execute-form-submit");
            insertBefore(labelElement, submitButton);
            insertBefore(inputElement, submitButton);
            insertBefore(document.createElement("br"), submitButton);
        }
        if (blockType == "OUTPUT") {
            var outputIdString = idString + "-output";
            var outputElement = document.createElement("textarea");
            outputElement.setAttribute("id", outputIdString);
            outputElement.setAttribute("name", outputIdString);
            outputElement.readOnly = true;
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", outputIdString);
            labelElement.innerText = label;
            var outputDiv = document.getElementById("output-div");
            outputDiv.appendChild(labelElement);
            outputDiv.appendChild(outputElement);
            outputDiv.appendChild(document.createElement("br"));
        }
    });

    // Handle API settings form submission
    var apiSettingsForm = document.getElementById("api-settings-form");
    var apiType;
    var apiParams;
    apiSettingsForm.addEventListener("submit", function (e) {
        e.preventDefault();
        apiType = apiSettingsForm.elements["api-settings-type"].value;
        apiParams = {};
        for (var param of Object.keys(apiTypes[apiType]["parameters"])) {
            apiParams[param] = apiSettingsForm.elements[param].value;
        }
    });

    // Handle execute form submission
    var executeForm = document.getElementById("execute-form");
    executeForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var promises = []
        getBlocksOfType("INPUT").forEach((inputBlock) => {
            console.log(inputBlock.id());
            var textIn = document.getElementById(inputBlock.id() + "-input").value;
            promises.push(activateBlock(textIn, inputBlock));
        });
        getBlocksOfType("INPUT-FIXED").forEach((inputBlock) => {
            var textIn = inputBlock.data("parameters")["INPUT-FIXED-text"];
            promises.push(activateBlock(textIn, inputBlock));
        });
        Promise.all(promises).then((responses) => { alert("done!") });
    });

    function activateBlock(input, block) {
        return new Promise((resolve, reject) => {
            block.addClass("active");
            setTimeout(() => {
                executeBlock(input, block).then(output => {
                    block.removeClass("active");
                    resolve(output);
                }).catch(error => {
                    block.removeClass("active");
                    reject(error);
                });
            }, 500);
        }).then((output) => {
            var promises = [];
            block.outgoers().forEach((outNeighbor) => {
                promises.push(activateBlock(output, outNeighbor));
            });
            return Promise.all(promises);
        });
    }

    function executeBlock(input, block) {
        return new Promise((resolve, reject) => {
            var blockType = block.data("block-type");
            var blockParams = block.data("parameters");
            switch (blockType) {
                case "INPUT":
                    resolve(input);
                    break;
                case "OUTPUT":
                    document.getElementById(block.id() + "-output").value = input;
                    resolve();
                    break;
                default:
                    resolve(input);
                    break;
            }
        });
    }

    function getBlocksOfType(blockType) {
        return cy.nodes('[id ^= "' + blockType + '"][id $= "\\d+"]');
    }
}

