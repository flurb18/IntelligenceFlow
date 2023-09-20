import cytoscape from 'cytoscape';

import { 
    notify,
    createSubmenusByType,
    deselectNode,
    destroyNode,
    newBlockData,
    resetState,
    addSelectionHandlers
} from './utils.js';

import { activateBlock } from './run.js';

import { addFileImportHandler, addFileExportHandler } from './files.js';

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
    cancel: false,
    apiType: document.getElementById("settings-api-type").value,
    cy: null
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
    state.cy = cytoscape({
        container: document.getElementById('flow-diagram'),
        zoom: 1,
        minZoom: 0.4,
        maxZoom: 2,
        elements: [],
        style: cytostyle,
        layout: { name: 'grid' }
    });
    
    addSelectionHandlers(state);
    addFileImportHandler(state);
    addFileExportHandler(state);

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
        var extent = state.cy.extent();
        var maxD = Math.floor(Math.min(extent.w, extent.h) / 6);
        // Block creation hook
        state.cy.add(blockFuncs[blockType].create(_data)).nodes().positions((node, i) => {
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

    // Handle running cancelation
    document.getElementById("execute-form-cancel").addEventListener("click", function(e) {
        e.preventDefault();
        resetState(state);
        if (state.running) {
            state.cancel = true;
        }
        notify("Cancelled");
    });

    function getBlocksOfType(blockType) {
        return state.cy.nodes('[id ^= "' + blockType+'"]');
    }
});

