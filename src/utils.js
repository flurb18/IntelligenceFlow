import { blockFuncs } from './blockfuncs.js';

import blockTypes from './blocktypes.json';

// Append a immediately after e
export function insertAfter(a, e) {
    if (e.nextSibling) {
        e.parentNode.insertBefore(a, e.nextSibling);
    } else {
        e.parentNode.appendChild(a);
    }
};

// Append a immediately before e
export function insertBefore(a, e) {
    e.parentNode.insertBefore(a, e);
};

// Remove e
export function removeElement(e) {
    e.parentNode.removeChild(e);
}

// Collect blocks of a certain type
export function getBlocksOfType(blockType, state) {
    return state.cy.nodes('[id ^= "' + blockType+'"]');
}

// Notify the user of text
var timeoutHandle = null;
export function notify(text) {
    document.getElementById("notification-text").innerText = text;
    document.getElementById("notification").style.display = "block";
    if (timeoutHandle) {
        clearTimeout(timeoutHandle);
    }
    timeoutHandle = setTimeout(function () {
        document.getElementById("notification").style.display = "none";
    }, 4000);
}

export function newBlockData(blockType, idNum, inputLabel) {
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
        "default-input-queue": [],
        "waiting-extra-input-queue": []
    };
}

// Reset global state
export function resetState(state) {
    state.cy.nodes().forEach((block) => {
        resetBlock(block);
    });
    deselectNode(state);
}

export function resetBlock(block) {
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
    block.data("waiting-extra-input-queue", []);
}

export function addParametersToMenu(parameters, menu, type) {
    if (Object.keys(parameters).length === 0) {
        menu.appendChild(document.createElement("br"));
        return;   
    }
    if (type) {
        var header = document.createElement("strong");
        header.innerText = type + " Parameters";
        menu.appendChild(header);
        menu.appendChild(document.createElement("br"));
    }
    for (var param of Object.keys(parameters)) {
        var paramLabel = document.createElement("label");
        paramLabel.setAttribute("for", param);
        paramLabel.innerText = parameters[param]["label"];
        menu.appendChild(paramLabel);
        switch (parameters[param]["type"]) {
            //Dropdown menu
            case "choice":
                var paramChoice = document.createElement("select");
                paramChoice.setAttribute("id", menu.id + "-" + param);
                paramChoice.setAttribute("name", param);
                for (var choice of parameters[param]["choices"]) {
                    var paramChoiceOption = document.createElement("option");
                    paramChoiceOption.setAttribute("value", choice);
                    paramChoiceOption.innerText = choice;
                    paramChoice.appendChild(paramChoiceOption);
                }
                menu.appendChild(paramChoice);
                menu.appendChild(document.createElement("br"));
                break;
            //Checkbox
            case "checkbox":
                var paramCheck = document.createElement("input");
                paramCheck.setAttribute("id", menu.id + "-" + param);
                paramCheck.setAttribute("name", param);
                paramCheck.setAttribute("type", "checkbox");
                paramCheck.setAttribute("value", "true");
                paramCheck.checked = parameters[param]["default"];
                menu.appendChild(paramCheck);
                menu.appendChild(document.createElement("br"));
                break;
            //Textline
            case "text":
            case "url":
                var paramText = document.createElement("input");
                paramText.setAttribute("id", menu.id + "-" + param);
                paramText.setAttribute("name", param);
                paramText.setAttribute("type", parameters[param]["type"]);
                menu.appendChild(paramText);
                menu.appendChild(document.createElement("br"));
                break;
            case "textbox":
                var paramTextbox = document.createElement("textarea");
                paramTextbox.setAttribute("id", menu.id + "-" + param);
                paramTextbox.setAttribute("name", param);
                menu.appendChild(paramTextbox);
                menu.appendChild(document.createElement("br"));
                break;
            //Numeric input
            case "num":
                var paramNum = document.createElement("input");
                var paramNumDisplay = document.createElement("output");
                paramNum.setAttribute("id", menu.id + "-" + param);
                paramNum.setAttribute("name", param);
                paramNum.setAttribute("type", "range");
                paramNum.setAttribute("min", parameters[param]["min"]);
                paramNum.setAttribute("max", parameters[param]["max"]);
                if (parameters[param].hasOwnProperty("step")) {
                    paramNum.setAttribute("step", parameters[param]["step"]);
                }
                paramNum.setAttribute("value", parameters[param]["default"]);
                paramNumDisplay.setAttribute("id", menu.id + "-" + param + "-display");
                paramNumDisplay.textContent = paramNum.value;
                paramNum.addEventListener("input", function () {
                    this.nextElementSibling.textContent = this.value;
                });
                menu.appendChild(paramNum);
                menu.appendChild(paramNumDisplay);
                menu.appendChild(document.createElement("br"))
                break;
            //File input
            case "file":
                var paramFile = document.createElement("input");
                paramFile.setAttribute("id", menu.id + "-" + param);
                paramFile.setAttribute("name", param);
                paramFile.setAttribute("type", "file");
                menu.appendChild(paramFile);
                menu.appendChild(document.createElement("br"));
                break;
            default:
                break;
        }
    }
}

// Creates submenus that are only visisble according to the choice of selectElement, according to the config object.
// config should consist of string:object pairs, where the string is an option to be added to selectElement, and the object
// describes the submenu to be created. The object should have an entry "parameters" mapping to an object of string:object pairs,
// where this object has an entry "label" and an entry "type". "type" should be in choice,text,num,file. "label" is what goes next to
// the field in the submenu.
export function createSubmenusByType(config, selectElement) {
    for (var type of Object.keys(config)) {
        if (config[type]["hidden"]) {
            continue;
        }
        // Create option in selectElement
        var typeOption = document.createElement("option");
        typeOption.setAttribute("value", type);
        typeOption.innerText = type;
        selectElement.appendChild(typeOption);
        // Create submenu
        let params = config[type]["parameters"];
        var typeSubmenu = document.createElement("div");
        typeSubmenu.setAttribute("id", type + "-submenu");
        typeSubmenu.setAttribute("name", type);
        typeSubmenu.setAttribute("class", "sidebar-submenu " + selectElement.getAttribute("name") + "-submenu")
        typeSubmenu.style.display = "none";
        addParametersToMenu(params, typeSubmenu, type);
        insertAfter(typeSubmenu, selectElement);
    }
    var firstType = Object.keys(config)[0];
    if (!(Object.keys(config[firstType]["parameters"]).length === 0)) {
        document.getElementById(firstType + "-submenu").style.display = "block";
    }
    selectElement.addEventListener("change", function () {
        let selectedValue = selectElement.options[selectElement.selectedIndex].value;
        for (var type of Object.keys(config)) {
            if (config[type]["hidden"]) {
                continue;
            }
            if (selectedValue === type && !(Object.keys(config[type]["parameters"]).length === 0)) {
                document.getElementById(type+"-submenu").style.display = "block";
            } else {
                document.getElementById(type+"-submenu").style.display = "none";
            }
        }
    });
}



// State altering functions

export function selectNode(node, state) {
    deselectNode(state);
    state.selectedNode = node;
    node.addClass("targeted");
    if (node.isEdge()) { return; }
    document.getElementById("edit-block-info").style.display = "none";
    var editMenu = document.getElementById("edit-block-menu");
    if (node.isChild()) {
        var childInfo = document.createElement("div");
        childInfo.innerText = "Cannot edit parameters of child node; select parent node to edit parameters."
        editMenu.appendChild(childInfo);
        return;   
    }
    const blockTypeParams = blockTypes[node.data("block-type")]["parameters"]
    if (Object.keys(blockTypeParams).length === 0) {
        var noParamInfo = document.createElement("div");
        noParamInfo.innerText = "No parameters to show."
        editMenu.appendChild(noParamInfo);
        return;
    }
    addParametersToMenu(blockTypeParams, editMenu, node.data("label"));
    for (var paramName of Object.keys(blockTypeParams)) {
        var inputElement = document.getElementById(editMenu.id + "-" + paramName);
        if (blockTypeParams[paramName].type === "checkbox") {
            inputElement.checked = node.data().parameters[paramName];   
        } else {
            inputElement.value = node.data().parameters[paramName];
        }
        if (blockTypeParams[paramName].type === "num") {
            var inputElementLabel = document.getElementById(editMenu.id + "-" + paramName + "-display");
            inputElementLabel.textContent = node.data().parameters[paramName];
        }
        
        if (blockTypeParams[paramName].final) {
            inputElement.disabled = true;
        }
    }
    var editButton = document.createElement("input");
    editButton.setAttribute("type", "submit");
    editButton.setAttribute("value", "Apply Edits");
    editButton.setAttribute("class", "sidebar-submit");
    editMenu.appendChild(editButton);
    editButton.addEventListener("click", function(e) {
        if (confirm("Are you sure you want to apply the parameter edits? Old parameters will be lost!")) {
            var params = node.data("parameters");
            for (var paramName of Object.keys(blockTypeParams)) {
                var inputElement = document.getElementById(editMenu.id + "-" + paramName);
                if (blockTypeParams[paramName].type === "checkbox") {
                    params[paramName] = inputElement.checked;   
                } else {
                    params[paramName] = inputElement.value;
                }
            }
            node.data("parameters", params);
            if (node.isParent()) {
                node.children().forEach((childNode) => {
                    childNode.data("parameters", params);
                });
            }
        }
    });
}

export function deselectNode(state) {
    if (state.selectedNode) {
        state.selectedNode.removeClass("targeted");
        state.selectedNode = null;
    }
    var editInfo = document.getElementById("edit-block-info");
    while (editInfo.nextElementSibling) {
        document.getElementById("edit-block-menu").removeChild(editInfo.nextElementSibling);
    }
    editInfo.style.display = "block";
}

export function destroyNode(e, state) {
    if (e.isNode()) {
        e.children().forEach((child) => {
            destroyNode(child, state);
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
