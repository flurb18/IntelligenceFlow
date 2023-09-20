import cytoscape from 'cytoscape';

import { blockFuncs } from "./blockfuncs.js";

import {
    newBlockData,
    notify,
    resetState,
    selectNode,
    deselectNode,
    destroyNode,
    getBlocksOfType
} from './utils.js';

import { activateBlock } from './run.js';

import blockTypes from "./blocktypes.json";
import cytostyle from "./cytoscape-styles.json";

export function addDeletionHandler(state) {
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
}

// Handle execute form submission
export function addExecuteHandler(state) {
    var executeForm = document.getElementById("execute-form");
    executeForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (state.running) {
            notify("Already running");
            return;
        }
        state.running = true;
        resetState(state);
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
            resetState(state);
            state.running = false;
            state.cancel = false;
        }).catch(error => {
            notify(error);
            resetState(state);
            state.running = false;
            state.cancel = false;
        });
    });
}

export function addFileImportHandler(state) {
    // Handle file import
    document.getElementById("import-form").addEventListener("submit", function (e) {
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
                    resetState(state);
                    state.blockTypeIdNums = data["state"].blockTypeIdNums;
                    state.cy.nodes().forEach((block) => {
                        blockFuncs[block.data("block-type")].destroy(block.data());
                    })
                    state.cy.destroy();
                    state.cy = cytoscape({
                        container: document.getElementById('flow-diagram'),
                        zoom: 1,
                        minZoom: 0.4,
                        maxZoom: 2,
                        elements: [],
                        style: cytostyle,
                        layout: { name: 'grid' }
                    });
                    state.cy.json(data["cytoscape"]);
                    addSelectionHandler(state);
                    state.cy.nodes().forEach((block) => {
                        // Run creation hook, but don't import data (already there)
                        blockFuncs[block.data("block-type")].create(block.data());
                    });
                    resetState(state);
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
                    state.cy.add(newEles);
                    resetState(state);
                    break;
            }
        }
    });
}

export function addFileExportHandler(state) {
    // Handle export form submission
    document.getElementById("export-form").addEventListener("submit", function(e) {
        e.preventDefault();
        if (state.running) { notify("Can't export while running"); return; }
        resetState(state);
        var text = JSON.stringify({
            "state": {
                selectedNode: null,
                blockTypeIdNums: state.blockTypeIdNums,
                running: false
            },
            "cytoscape": state.cy.json()
        });
        var element = document.createElement('a');
        element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', "flow.json");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    });
}

export function addSelectionHandler(state) {
    function handleBlockSelection(event) {
        if (state.running) {
            return;
        }
        if (event.target === state.cy) {
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
                state.cy.add([{
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

    state.cy.on('cxttap', handleBlockSelection);
    state.cy.on('taphold', handleBlockSelection);
}
