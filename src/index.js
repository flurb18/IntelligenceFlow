import cytoscape from 'cytoscape';

import { 
    notify,
    createSubmenusByType,
    selectNode,
    deselectNode,
    destroyNode,
    newBlockData,
    resetBlock
} from './utils.js';

import { activateBlock } from './run.js';

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

for (var blockType of Object.keys(blockTypes)) {
    state.blockTypeIdNums[blockType] = [0];
}

document.getElementById("settings-form").addEventListener("submit", function(e) {
    e.preventDefault();
    state.apiType = document.getElementById("settings-api-type").value;
    notify("Settings saved");
});

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

    // Handle delete block button
    document.getElementById("delete-block-button").addEventListener("click", function(e) {
        if (state.selectedNode) {
            var toDestroy = state.selectedNode;
            deselectNode(state);
            if ((!toDestroy.isNode() && toDestroy.data("user-created")) ||
                (toDestroy.isNode() && !toDestroy.isChild())) {
                if (confirm("Are you sure you want to delete the selection?")) {
                    destroyNode(toDestroy, state);
                }
            } else {
                notify("You can only delete top-level blocks and edges.");
            }
            
        }
    });

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
            promises.push(activateBlock(textIn, inputBlock, "UserInput", state));
        });
        getBlocksOfType("FIXED-INPUT").forEach((inputBlock) => {
            promises.push(activateBlock("", inputBlock, "FixedInput", state));
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

