import cytoscape from 'cytoscape';

import { notify, createSubmenusByType, selectNode, deselectNode } from './utils.js';
import { blockFuncs } from './blockfuncs.js';

import blockTypes from './blocktypes.json';
import cytostyle from './cytoscape-styles.json';

function addApiType(type) {
    var selectElement = document.getElementById("settings-api-type");
    var choiceOption = document.createElement("option");
    choiceOption.setAttribute("value", type);
    choiceOption.innerText = type;
    selectElement.appendChild(choiceOption);
}

if (ENABLE_OPENAI) {
    addApiType("OpenAI");
}
if (ENABLE_OOBABOOGA) {
    addApiType("Oobabooga");
}
if (ENABLE_KOBOLDCPP) {
    addApiType("KoboldCPP");
}

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


createSubmenusByType(blockTypes, document.getElementById("new-block-type"));

document.getElementById("edit-block-menu").addEventListener("submit", (e) => {e.preventDefault()});

var state = {
    selectedNode: null,
    blockTypeIdNums: {},
    running: false,
    apiType: document.getElementById("settings-api-type").value
}

document.addEventListener('DOMContentLoaded', function () {

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

    document.getElementById("settings-form").addEventListener("submit", function(e) {
        e.preventDefault();
        state.apiType = document.getElementById("settings-api-type").value;
        notify("Settings saved");
    });

    for (var blockType of Object.keys(blockTypes)) {
        state.blockTypeIdNums[blockType] = [0];
    }

    cy.on('cxttap', handleBlockSelection);
    cy.on('taphold', handleBlockSelection);

    
    function handleBlockSelection(event) {
        if (state.running) {
            return;
        }
        if (event.target === cy) {
            deselectNode(state);
            return;
        }
        if (!state.selectedNode) {
            selectNode(event.target, state);
            return;
        }
        if ((event.target.isEdge() || state.selectedNode.isEdge())) {
            selectNode(event.target, state);
            return;
        }
        if (state.selectedNode.isParent() || event.target.isParent()) {
            selectNode(event.target, state);
            return;
        }
        if (!(state.selectedNode.id() === event.target.id())) {
            var srcBlockType = state.selectedNode.data("block-type");
            var destBlockType = event.target.data("block-type");
            var srcOutputType = blockTypes[srcBlockType]["maps"][state.selectedNode.data("input-type")];
            var destAssignedInputType = event.target.data("input-type");
            var destAvailableInputTypes = Object.keys(blockTypes[destBlockType]["maps"]);
            if (!(srcOutputType === "none" || srcOutputType === "unavailable" || destAssignedInputType === "unavailable") && (
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
                        "target": event.target.id(),
                        "user-created": true
                    },
                    "classes": _classes
                }]);
                event.target.data("input-type", srcOutputType);
            } else {
                notify("Incompatible blocks");
            }
            deselectNode(state);
        }
    }

    function destroyElement(e) {
        if (e.isNode()) {
            e.children().forEach((child) => {
                destroyElement(child);
            });
            var blockType = e.data("block-type");
            blockFuncs[blockType].destroy(e.data());
            var idx = state.blockTypeIdNums[blockType].indexOf(e.data("idNum"));
            if (idx > -1) {
                state.blockTypeIdNums[blockType].splice(idx, 1);
            }
        }
        e.remove();
    }

    // Handle delete block button
    document.getElementById("delete-block-button").addEventListener("click", function(e) {
        if (state.selectedNode) {
            var toDestroy = state.selectedNode;
            deselectNode(state);
            if ((!toDestroy.isNode() && toDestroy.data("user-created")) ||
                (toDestroy.isNode() && !toDestroy.isChild())) {
                if (confirm("Are you sure you want to delete the selection?")) {
                    destroyElement(toDestroy);
                }
            } else {
                notify("You can only delete top-level blocks and edges.");
            }
            
        }
    });

    function newBlockData(blockType, idNum, inputLabel) {
        var idString = blockType + idNum;
        var label = inputLabel ? idString + "-" + inputLabel : idString;
        return {
            "id": idString,
            "idNum": idNum,
            "label": label,
            "barelabel": inputLabel,
            "block-type": blockType,
            "input-type": "none",
            "parameters": {},
            "waits-for": [],
            "default-input-queue": []
        };
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
        var _data = newBlockData(blockType, newId, newBlockForm.elements["new-block-label"].value);
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
            state.selectedNode.removeClass("targeted");
            state.selectedNode = null;
        }
        reset();
        var promises = [];
        getBlocksOfType("INPUT").forEach((inputBlock) => {
            var textIn = document.getElementById(inputBlock.id() + "-input").value;
            promises.push(activateBlock(textIn, inputBlock, "UserInput"));
        });
        getBlocksOfType("FIXED-INPUT").forEach((inputBlock) => {
            promises.push(activateBlock("", inputBlock, "FixedInput"));
        });
        Promise.all(promises).then((responses) => { 
            notify("Done!");
            console.log("Done!");
            reset();
            state.running = false;
        }).catch(error => {
            notify(error);
            reset();
            state.running = false;
        });
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
                                resolve(executeOutput);
                            }).catch(error => {
                                resetBlock(block);
                                reject(error);
                            });
                        }, 500);
                    } else {
                        block.scratch("queued-inputs", queuedInputs);
                        block.scratch("waiting-for", waitIds);
                        resolve([{
                            done: false
                        }]);
                    }
                } else {
                    console.log("Waiting block" + block.id() + " got extra input");
                }
            } else {
                block.data("default-input-queue").push({
                    "input": input,
                    "resolve": resolve,
                    "reject": reject
                });
                if (!block.hasClass("running")) {
                    block.addClass("running");
                    executeBlockQueue(block).then((out) => {
                        block.removeClass("running");
                    }).catch((reason) => {
                        block.removeClass("running");
                    });
                }
            }
        }).then((statuses) => {
            var activationPromises = [];
            statuses.forEach((status) => {
                if (status.done) {
                    if (status.hasOwnProperty("for")) { 
                        activationPromises.push(activateBlock(status.output, block.cy().getElementById(status.for), block.id()));
                    } else {
                        block.outgoers('node').forEach((outNeighbor) => {
                            activationPromises.push(activateBlock(status.output, outNeighbor, block.id()));
                        });
                    }
                }
            });
            return Promise.all(activationPromises);
        });
    }

    function executeBlockQueue(block) {
        return new Promise((resolve, reject) => {
            const queueItem = block.data("default-input-queue").shift();
            block.addClass("active");
            setTimeout(() => {
                executeBlock(queueItem["input"], block).then(executeOutput => {
                    block.removeClass("active");
                    queueItem["resolve"](executeOutput);
                    resolve();
                }).catch(error => {
                    block.removeClass("active");
                    queueItem["reject"](error);
                    reject();
                });
            }, 500);
        }).then((out) => {
            if (block.data("default-input-queue").length == 0) {
                return Promise.resolve();
            } else {
                return executeBlockQueue(block);
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
            var selectElement = document.getElementById("import-file-type");
            switch (selectElement.options[selectElement.selectedIndex].value) {
                case "new":
                    if (!confirm("Import file? Current flow will be lost!")) {
                        return;
                    }
                    reset();
                    state.blockTypeIdNums = data["state"].blockTypeIdNums;
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
                    break;                    
                case "copy":
                    if (!confirm("Import file into current flow?")) {
                        return;
                    }
                    var nodesData = data["cytoscape"]["elements"]["nodes"];
                    var newEles = [];
                    var idMap = {};
                    var idNumMap = {};
                    Object.keys(nodesData).forEach((nodeKey) => {
                        var nodeData = nodesData[nodeKey]["data"];
                        var blockType = nodeData["block-type"];
                        if (!blockTypes[blockType]["hidden"]) {
                            var newIdNum = Math.max(...state.blockTypeIdNums[blockType]) + 1;
                            var newId = blockType + newIdNum;
                            idMap[nodeData["id"]] = newId;
                            idNumMap[nodeData["id"]] = newIdNum;
                            state.blockTypeIdNums[blockType].push(newIdNum);
                        }
                    });
                    Object.keys(nodesData).forEach((nodeKey) => {
                        var nodeData = nodesData[nodeKey]["data"];
                        var blockType = nodeData["block-type"];
                        if (!blockTypes[blockType]["hidden"]) {
                            var _data = newBlockData(blockType, idNumMap[nodeData["id"]], nodeData["barelabel"]);
                            _data["input-type"] = nodeData["input-type"];
                            _data["parameters"] = nodeData["parameters"];
                            blockFuncs[blockType].create(_data).forEach((desc) => {
                                if (desc["group"] === "nodes") {
                                    var pos = {
                                        x: nodesData[nodeKey]["position"]["x"],
                                        y: nodesData[nodeKey]["position"]["y"]
                                    }
                                    if (blockTypes[desc["data"]["block-type"]]["hidden"]) {
                                        var oldId = desc["data"]["id"].replace(_data["id"], nodeData["id"]);
                                        idMap[oldId] = desc["data"]["id"];
                                        //Find old node and take position
                                        Object.keys(nodesData).forEach((nodeSearchKey) => {
                                            if (nodesData[nodeSearchKey]["data"]["id"] === oldId) {
                                                pos = {
                                                    x: nodesData[nodeSearchKey]["position"]["x"],
                                                    y: nodesData[nodeSearchKey]["position"]["y"]
                                                };
                                            }
                                        });
                                    }
                                    newEles.push({
                                        ...desc,
                                        "position": pos
                                    });
                                } else {
                                    newEles.push(desc);
                                }
                            });
                        }
                    });
                    var edgesData = data["cytoscape"]["elements"]["edges"];
                    Object.keys(edgesData).forEach((edgeKey) => {
                        var oldEdgeData = edgesData[edgeKey]["data"];
                        if (oldEdgeData["user-created"]) {
                            var newSource = idMap[oldEdgeData["source"]];
                            var newTarget = idMap[oldEdgeData["target"]];
                            newEles.push({
                                group: 'edges',
                                data: {
                                    "id": newSource + newTarget,
                                    "source": newSource,
                                    "target": newTarget,
                                    "user-created": true
                                }
                            });
                        }
                    });
                    cy.add(newEles);
                    reset();
                    break;
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


    function resetBlock(block) {
        block.removeClass("active");
        block.removeClass("waiting");
        block.scratch({
            "waiting-for": [...block.data("waits-for")],
            "queued-inputs": {}
        });
        if (block.data("block-type") === "SAVE") {
            block.data("save", null);
        }
        block.data("default-input-queue", []);
    }

    function reset() {
        cy.nodes().forEach((block) => {
            resetBlock(block);
        });
        if (state.selectedNode) {
            state.selectedNode.removeClass("targeted");
        }
        deselectNode(state);
    }

    function getBlocksOfType(blockType) {
        return cy.nodes('[id ^= "' + blockType+'"]');
    }
});

