document.addEventListener('DOMContentLoaded', function () {
    const cy = cytoscape({
        container: document.getElementById('flow-diagram'),
        zoom: 1,
        minZoom: 0.5,
        maxZoom: 2,
        elements: [],
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#666',
                    'label': 'data(id)'
                }
            },
            {
                selector: 'node.selected',
                style: {
                    'background-color': '#8f8'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'straight'
                }
            },
            {
                selector: 'edge.multi',
                style: {
                    'curve-style': 'haystack',
                    'haystack-radius': 1
                }
            }
        ],
        layout: { name: 'grid' }
    });

    var selectedNode = null;
    cy.on('cxttap', 'node', function (event) {
        if (selectedNode) {
            var srcBlockType = selectedNode.data("block-type");
            var destBlockType = event.target.data("block-type");
            var srcOutputType = blockTypes[srcBlockType]["block-output-type"];
            var destInputTypes = blockTypes[destBlockType]["block-input-types"];
            if (destInputTypes.includes(srcOutputType) && !(srcOutputType === "none")) {
                switch (srcOutputType) {
                    case "single":
                        cy.add([{
                            "group": 'edges',
                            "data": {
                                "id": selectedNode.id() + event.target.id(),
                                "source": selectedNode.id(),
                                "target": event.target.id()
                            }
                        }]);
                        break;
                    case "multi":
                        for (var i = 0; i < 20; i++) {
                            cy.add([{
                                "group": 'edges',
                                "data": {
                                    "id": selectedNode.id() + event.target.id() + i,
                                    "source": selectedNode.id(),
                                    "target": event.target.id(),
                                    "classes": "multi"
                                }
                            }]);
                        }
                        break;
                    default:
                        break;
                }
            }
            selectedNode.toggleClass("selected");
            selectedNode = null;
        } else {
            selectedNode = event.target;
            selectedNode.toggleClass("selected");
        }
    });

    // Handle new block form submission
    var newBlockForm = document.getElementById("new-block-form");
    newBlockForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var extent = cy.extent();
        var blockType = newBlockForm.elements["new-block-type"].value;
        var _data = {
            "id": newBlockForm.elements["new-block-label"].value,
            "block-type": blockType,
            "parameters" : {}
        };
        for (param of Object.keys(blockTypes[blockType]["parameters"])) {
            _data["parameters"][param] = newBlockForm.elements[param].value;
        }
        cy.add([{
            group: 'nodes',
            data: _data,
            position: {
                x: (extent.x1 + extent.x2) / 2,
                y: (extent.y1 + extent.y2) / 2
            }
        }]);
    });
});

const blockTypes = {
    "INPUT": {
        "block-input-types": [
            "none"
        ],
        "block-output-type": "single",
        "parameters": {
            "INPUT-type": {
                "label": "Type of Input",
                "type": "choice",
                "choices": ["Input Text", "Choose File"]
            },
            "INPUT-text": {
                "label": "Input Text",
                "type": "text"
            }/*,
            "INPUT-file" : {
                "label" : "Input File",
                "type" : "file"
            }*/
        }
    },
    "OUTPUT": {
        "block-input-types": [
            "single",
            "multi"
        ],
        "block-output-type": "none",
        "parameters": {
            "OUTPUT-type": {
                "label": "Type of Output",
                "type": "choice",
                "choices": ["Output In Browser"]
            }
        }
    },
    "SPLIT": {
        "block-input-types": [
            "single"
        ],
        "block-output-type": "multi",
        "parameters": {
            "SPLIT-chunk-size": {
                "label": "Chunk Size",
                "type": "num",
                "min": "0",
                "max": "100"
            },
            "SPLIT-chunk-overlap": {
                "label": "Chunk Overlap",
                "type": "num",
                "min": "0",
                "max": "100"
            }
        }
    },
    "COMBINE": {
        "block-input-types": [
            "multi"
        ],
        "block-output-type": "single",
        "parameters": {

        }
    }
}

const apiTypes = {
    "OpenAI": {
        "parameters": {
            "OpenAI-APIkey": {
                "label": "API Key",
                "type": "text"
            }
        }
    },
    "Oobabooga": {
        "parameters": {
            "Oobabooga-URL": {
                "label": "API URL",
                "type": "text"
            }
        }
    }
}

// Append a immediately after e
function insertAfter(a, e) {
    if (e.nextSibling) {
        e.parentNode.insertBefore(a, e.nextSibling);
    } else {
        e.parentNode.appendChild(a);
    }
}

// Creates submenus that are only visisble according to the choice of selectElement, according to the config object.
// config should consist of string:object pairs, where the string is an option to be added to selectElement, and the object
// describes the submenu to be created. The object should have an entry "parameters" mapping to an object of string:object pairs,
// where this object has an entry "label" and an entry "type". "type" should be in choice,text,num,file. "label" is what goes next to
// the field in the submenu.
function createSubmenusByType(config, selectElement) {
    for (var type of Object.keys(config)) {
        // Create option in selectElement
        var typeOption = document.createElement("option");
        typeOption.setAttribute("value", type);
        typeOption.innerText = type;
        selectElement.appendChild(typeOption);
        // Create submenu
        var typeSubmenu = document.createElement("div");
        var typeSubmenuHeader = document.createElement("strong");
        typeSubmenuHeader.innerText = type + " Parameters";
        typeSubmenu.appendChild(typeSubmenuHeader);
        typeSubmenu.appendChild(document.createElement("br"));
        typeSubmenu.setAttribute("id", type + "-submenu");
        typeSubmenu.setAttribute("name", type);
        typeSubmenu.setAttribute("class", "sidebar-submenu " + selectElement.getAttribute("name") + "-submenu")
        typeSubmenu.style.display = "none";
        let params = config[type]["parameters"];
        for (var param of Object.keys(params)) {
            var paramLabel = document.createElement("label");
            paramLabel.setAttribute("for", param);
            paramLabel.innerText = params[param]["label"];
            typeSubmenu.appendChild(paramLabel);
            switch (params[param]["type"]) {
                //Dropdown menu
                case "choice":
                    var paramChoice = document.createElement("select");
                    paramChoice.setAttribute("id", param);
                    paramChoice.setAttribute("name", param);
                    for (var choice of params[param]["choices"]) {
                        var paramChoiceOption = document.createElement("option");
                        paramChoiceOption.setAttribute("value", choice);
                        paramChoiceOption.innerText = choice;
                        paramChoice.appendChild(paramChoiceOption);
                    }
                    typeSubmenu.appendChild(paramChoice);
                    typeSubmenu.appendChild(document.createElement("br"));
                    break;
                //Textbox
                case "text":
                    var paramText = document.createElement("input");
                    paramText.setAttribute("id", param);
                    paramText.setAttribute("name", param);
                    paramText.setAttribute("type", "text");
                    typeSubmenu.appendChild(paramText);
                    typeSubmenu.appendChild(document.createElement("br"))
                    break;
                //Numeric input
                case "num":
                    var paramNum = document.createElement("input");
                    paramNum.setAttribute("id", param);
                    paramNum.setAttribute("name", param);
                    paramNum.setAttribute("type", "range");
                    paramNum.setAttribute("min", params[param]["min"]);
                    paramNum.setAttribute("max", params[param]["max"]);
                    typeSubmenu.appendChild(paramNum);
                    typeSubmenu.appendChild(document.createElement("br"))
                    break;
                //File input
                case "file":
                    var paramFile = document.createElement("input");
                    paramFile.setAttribute("id", param);
                    paramFile.setAttribute("name", param);
                    paramFile.setAttribute("type", "file");
                    typeSubmenu.appendChild(paramFile);
                    typeSubmenu.appendChild(document.createElement("br"));
                    break;
                default:
                    break;
            }
        }
        insertAfter(typeSubmenu, selectElement);
    }
    var firstType = Object.keys(config)[0];
    document.getElementById(firstType + "-submenu").style.display = "block";
    selectElement.addEventListener("change", function () {
        let selectedValue = selectElement.options[selectElement.selectedIndex].value;
        let submenus = document.getElementsByClassName(selectElement.getAttribute("name") + "-submenu")
        for (let i = 0; i < submenus.length; i += 1) {
            if (selectedValue === submenus[i].getAttribute("name")) {
                submenus[i].style.display = "block";
            } else {
                submenus[i].style.display = "none";
            }
        }
    });
}


// Create block type submenus
createSubmenusByType(blockTypes, document.getElementById("new-block-type"));
createSubmenusByType(apiTypes, document.getElementById("api-settings-type"));

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
