import cytoscape from 'cytoscape';

import { 
    notify,
    createSubmenusByType
} from './utils.js';

import { 
    addFileImportHandler,
    addFileExportHandler,
    addSelectionHandler,
    addExecuteHandler,
    addDeletionHandler,
    addNewBlockHandler,
    addCancellationHandler
} from './handlers.js';

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

document.getElementById("edit-block-menu").addEventListener("submit", (e) => {e.preventDefault()});

createSubmenusByType(blockTypes, document.getElementById("new-block-type"));

var state = {
    blockTypeIdNums: {},
    running: false,
    cancel: false,
    apiType: document.getElementById("settings-api-type").value,
    animationDelay: document.getElementById("settings-animation-delay").value,
    selectedNode: null,
    cy: null
}

for (var blockType of Object.keys(blockTypes)) {
    state.blockTypeIdNums[blockType] = [0];
}

document.getElementById("settings-form").addEventListener("submit", function(e) {
    e.preventDefault();
    state.apiType = document.getElementById("settings-api-type").value;
    state.animationDelay = document.getElementById("settings-animation-delay").value;
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
    
    // selectionHandler adds event listeners to cy - if cy is destroyed must re-add selectionHandler
    addSelectionHandler(state);
    // The rest add event listeners to normal html elements
    addExecuteHandler(state);
    addCancellationHandler(state);
    addDeletionHandler(state);
    addNewBlockHandler(state);
    addFileImportHandler(state);
    addFileExportHandler(state);
    
});

