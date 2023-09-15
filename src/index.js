import cytoscape from 'cytoscape';

import { notify, createSubmenusByType, insertAfter } from './utils.js';
import { blockFuncs } from './blockfuncs.js';

import blockTypes from './blocktypes.json';
import apiTypes from './apitypes.json';
import cytostyle from './cytoscape-styles.json';

// Generate block type info
var infoSection = document.getElementById("sidebar-info");
for (var blockType of Object.keys(blockTypes)) {
    if (blockTypes[blockType]["hidden"]) { continue; }
    var button = document.createElement("button");
    button.setAttribute("class", "sidebar-submenu-expand-button");
    button.innerText = blockType;
    var div = document.createElement("div");
    div.setAttribute("class", "sidebar-submenu-expand");
    div.innerText = blockTypes[blockType]["info"];
    infoSection.appendChild(button);
    infoSection.appendChild(div);
}

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
/*var forms = document.getElementsByClassName("sidebar-submenu-expand");
for (var form of forms) {
    form.addEventListener('keypress', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
        }
    });
}*/

document.addEventListener('DOMContentLoaded', function () {
    createSubmenusByType(blockTypes, document.getElementById("new-block-type"));
    createSubmenusByType(apiTypes, document.getElementById("api-settings-type"));

    // Run Cytoscape
    var cy = cytoscape({
        container: document.getElementById('flow-diagram'),
        zoom: 1,
        minZoom: 0.4,
        maxZoom: 2,
        elements: [],
        style: cytostyle,
        layout: { name: 'grid' }
    });

    var state = {
        selectedNode: null,
        blockTypeIdNums: {},
        apiType: "none",
        apiParams: {},
        running: false
    }

    for (var blockType of Object.keys(blockTypes)) {
        state.blockTypeIdNums[blockType] = [0];
    }

    cy.on('cxttap', handleBlockSelection);
    cy.on('taphold', handleBlockSelection);
    
    function handleBlockSelection(event) {
        if (event.target === cy || !(event.target.isNode()) || state.running) {
            if (state.selectedNode) {
                state.selectedNode.removeClass("selected");
                state.selectedNode = null;
            }
            return;
        }
        if (!state.selectedNode) {
            state.selectedNode = event.target;
            state.selectedNode.addClass("selected");
            return;
        }
        if (!(state.selectedNode.id() === event.target.id())) {
            var srcBlockType = state.selectedNode.data("block-type");
            var destBlockType = event.target.data("block-type");
            var srcOutputTypes = blockTypes[srcBlockType]["maps"][state.selectedNode.data("input-type")];
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
                            "id": state.selectedNode.id() + event.target.id(),
                            "source": state.selectedNode.id(),
                            "target": event.target.id()
                        },
                        "classes": _classes
                    }]);
                    event.target.data("input-type", srcOutputType);
                } else {
                    notify("Incompatible blocks");
                }
            }
            state.selectedNode.removeClass("selected");
            state.selectedNode = null;
        }
    }

    // Handle new block form submission
    var newBlockForm = document.getElementById("new-block-form");
    newBlockForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (state.running) {
            notify("Cannot create new block while running");
            return;
        }
        var blockType = newBlockForm.elements["new-block-type"].value;
        var newId = Math.max(...state.blockTypeIdNums[blockType]) + 1;
        var idString = blockType + newId;
        var inputLabel = newBlockForm.elements["new-block-label"].value;
        var label = inputLabel ? idString + "-" + inputLabel : idString;
        var _data = {
            "id": idString,
            "label": label,
            "block-type": blockType,
            "input-type": "none",
            "parameters": {},
            "waits-for": []
        };
        state.blockTypeIdNums[blockType].push(newId);
        for (var param of Object.keys(blockTypes[blockType]["parameters"])) {
            _data["parameters"][param] = newBlockForm.elements[param].value;
        }
        var extent = cy.extent();
        var maxD = Math.floor(Math.min(extent.w, extent.h) / 6);
        // Block creation hook
        cy.add(blockFuncs[blockType].create(_data)).nodes().positions((node, i) => {
            return {
                x: ((extent.x1 + extent.x2) / 2) + Math.floor(Math.random() * 2 * maxD) - maxD,
                y: ((extent.y1 + extent.y2) / 2) + Math.floor(Math.random() * 2 * maxD) - maxD
            }
        });
    });

    // Handle API settings form submission
    var apiSettingsForm = document.getElementById("api-settings-form");
    apiSettingsForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (state.running) {
            notify("Cannot save API settings while running");
            return;
        }
        state.apiType = apiSettingsForm.elements["api-settings-type"].value;
        state.apiParams = {};
        for (var param of Object.keys(apiTypes[state.apiType]["parameters"])) {
            state.apiParams[param] = apiSettingsForm.elements[param].value;
        }
        notify("API settings saved.");
    });

    // Handle execute form submission
    var executeForm = document.getElementById("execute-form");
    executeForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (state.running) {
            notify("Already running");
            return;
        }
        state.running = true;
        if (state.selectedNode) {
            state.selectedNode.toggleClass("selected");
            state.selectedNode = null;
        }
        reset();
        var promises = []
        getBlocksOfType("INPUT").forEach((inputBlock) => {
            var textIn = document.getElementById(inputBlock.id() + "-input").value;
            promises.push(activateBlock(textIn, inputBlock, "UserInput"));
        });
        getBlocksOfType("INPUT-FIXED").forEach((inputBlock) => {
            var textIn = inputBlock.data("parameters")["INPUT-FIXED-text"];
            promises.push(activateBlock(textIn, inputBlock, "FixedInput"));
        });
        Promise.all(promises).then((responses) => { 
            notify("Done!");
            reset();
            state.running = false;
        }).catch(error => {
            reset();
            state.running = false;
        });
    });

    // Handle running cancelation
    document.getElementById("execute-form-cancel").addEventListener("click", function(e) {
        e.preventDefault();
        reset();
        state.running = false;
        notify("Cancelled");
    });

    // Handle file import
    document.getElementById("import-form").addEventListener("submit", function(e) {
        e.preventDefault();
        if (state.running) { notify("Can't import while running"); return; }
        var file = document.getElementById('import-file').files[0];
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = function (evt) {
            var data = JSON.parse(evt.target.result);
            if (confirm("Import file? Current flow will be lost!")) {
                reset();
                state = data["state"];
                cy.nodes().forEach((block) => {
                    blockFuncs[block.data("block-type")].destroy(block.data());
                })
                cy.destroy();
                cy = cytoscape({
                    container: document.getElementById('flow-diagram'),
                    zoom: 1,
                    minZoom: 0.4,
                    maxZoom: 2,
                    elements: [],
                    style: cytostyle,
                    layout: { name: 'grid' }
                });
                cy.json(data["cytoscape"]);
                cy.on('cxttap', handleBlockSelection);
                cy.on('taphold', handleBlockSelection);
                cy.nodes().forEach((block) => {
                    // Run creation hook, but don't import data (already there)
                    blockFuncs[block.data("block-type")].create(block.data());
                });
                reset();
            }
        }
    });

    // Handle export form submission
    document.getElementById("export-form").addEventListener("submit", function(e) {
        e.preventDefault();
        if (state.running) { notify("Can't export while running"); return; }
        reset();
        var text = JSON.stringify({
            "state": {
                selectedNode: null,
                blockTypeIdNums: state.blockTypeIdNums,
                apiType: "none",
                apiParams: {},
                running: false
            },
            "cytoscape": cy.json()
        });
        var element = document.createElement('a');
        element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', "flow.json");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    });

    function activateBlock(input, block, srcId) {
        if (!state.running) {
            return new Promise((resolve, reject) => reject("Stopped"));
        }
        return new Promise((resolve, reject) => {
            if (!(block.data("waits-for").length == 0)) {
                var waitIds = [...block.scratch("waiting-for")];
                var queuedInputs = block.scratch("queued-inputs");
                var idx = waitIds.indexOf(srcId);
                if (idx > -1) {
                    block.addClass("waiting");
                    waitIds.splice(idx, 1);
                    queuedInputs[srcId] = input;
                    if (waitIds.length == 0) {
                        block.removeClass("waiting")
                        block.addClass("active");
                        setTimeout(() => {
                            executeBlock(queuedInputs, block).then(executeOutput => {
                                resetBlock(block);
                                resolve({
                                    done: true,
                                    output: executeOutput
                                });
                            }).catch(error => {
                                console.log(error);
                                resetBlock(block);
                                reject(error);
                            });
                        }, 500);
                    } else {
                        block.scratch("queued-inputs", queuedInputs);
                        block.scratch("waiting-for", waitIds);
                        resolve({
                            done: false
                        });
                    }
                } else {
                    console.log("Waiting block" + block.id() + " got extra input");
                }
            } else {
                // Run block immediately
                block.addClass("active");
                setTimeout(() => {
                    executeBlock(input, block).then(executeOutput => {
                        block.removeClass("active");
                        resolve({
                            done: true,
                            output: executeOutput
                        });
                    }).catch(error => {
                        console.log(error);
                        block.removeClass("active");
                        reject(error);
                    });
                }, 500);
            }
        }).then((status) => {
            if (status.done) {
                var promises = [];
                block.outgoers('node').forEach((outNeighbor) => {
                    promises.push(activateBlock(status.output, outNeighbor, block.id()));
                });
                return Promise.all(promises);
            } else {
                return Promise.resolve();
            }
        });
    }

    function executeBlock(input, block) {
        if (!state.running) {
            return new Promise((resolve, reject) => reject("Stopped"));
        }
        return new Promise((resolve, reject) => {
            var blockType = block.data("block-type");
            // Run block
            blockFuncs[blockType].exec(input, block.data(), state, resolve, reject);
        });
    }

    function resetBlock(block) {
        block.removeClass("active");
        block.removeClass("waiting");
        block.scratch({
            "waiting-for": [...block.data("waits-for")],
            "queued-inputs": {}
        });
    }

    function reset() {
        cy.nodes().forEach((block) => {
            resetBlock(block);
        });
        if (state.selectedNode) {
            state.selectedNode.removeClass("selected");
        }
        state.selectedNode = null;
    }

    function getBlocksOfType(blockType) {
        return cy.nodes('[id ^= "' + blockType+'"]');
    }
});

