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
                    'label': 'data(label)'
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
                    'width': 15,
                    'line-style': 'dashed',
                    'arrow-scale': 0.8
                }
            }
        ],
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
        var newId = Math.max(...blockTypeIdNums[blockType])+1;
        var idString = blockType + newId;
        var label = newBlockForm.elements["new-block-label"].value;
        var _data = {
            "id": idString,
            "label": label ? idString + "-" + label : idString,
            "block-type": blockType,
            "input-type": "none",
            "parameters" : {}
        };
        blockTypeIdNums[blockType].push(newId);
        for (param of Object.keys(blockTypes[blockType]["parameters"])) {
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
    });

    function getBlocksOfType(blockType) {
        var blocks = [];
        for (var id of blockTypeIdNums[blockType]) {
            if (!(id === 0)) {
                blocks.push(cy.nodes().getElementById(blockType + id));
            }
        }
        return blocks;
    }
});

const blockTypes = {
    "INPUT": {
        "maps": {
            "none": ["single"]
        },
        "parameters": {}
    },
    "INPUT-FIXED": {
        "maps": {
            "none": ["single"]
        },
        "parameters": {
            "INPUT-FIXED-text": {
                "label": "Fixed Text Input",
                "type": "textbox"
            }
        }
    },
    "OUTPUT": {
        "maps": {
            "none": ["none"],
            "single": ["none"],
            "multi": ["none"]
        },
        "parameters": {}
    },
    "COPY": {
        "maps": {
            "none": ["none"],
            "single": ["multi"],
            "multi": ["multi"]
        },
        "parameters": {
            "COPY-num-copies": {
                "label": "Number of Copies",
                "type": "num",
                "min": "2",
                "max": "100"
            }
        }
    },
    "SPLIT": {
        "maps": {
            "none": ["none"],
            "single": ["multi"],
            "multi": ["multi"]
        },
        "parameters": {
            "SPLIT-chunk-size": {
                "label": "Chunk Size",
                "type": "num",
                "min": "100",
                "max": "1000"
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
        "maps": {
            "none": ["none"],
            "single": ["none"],
            "multi": ["single"]
        },
        "parameters": {

        }
    },
    "LLM": {
        "maps": {
            "none": ["none"],
            "single": ["single"],
            "multi": ["multi"]
        },
        "parameters": {
            "LLM-query" : {
                "label": "Query for LLM",
                "type": "textbox"
            }
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
        if (params.length === 0) {
            insertAfter(document.createElement("br"), selectElement);
        }
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
                //Textline
                case "text":
                    var paramText = document.createElement("input");
                    paramText.setAttribute("id", param);
                    paramText.setAttribute("name", param);
                    paramText.setAttribute("type", "text");
                    typeSubmenu.appendChild(paramText);
                    typeSubmenu.appendChild(document.createElement("br"));
                    break;
                case "textbox":
                    var paramTextbox = document.createElement("textarea");
                    paramTextbox.setAttribute("id", param);
                    paramTextbox.setAttribute("name", param);
                    typeSubmenu.appendChild(paramTextbox);
                    typeSubmenu.appendChild(document.createElement("br"));
                    break;
                //Numeric input
                case "num":
                    var paramNum = document.createElement("input");
                    var paramNumDisplay = document.createElement("output");
                    paramNum.setAttribute("id", param);
                    paramNum.setAttribute("name", param);
                    paramNum.setAttribute("type", "range");
                    paramNum.setAttribute("min", params[param]["min"]);
                    paramNum.setAttribute("max", params[param]["max"]);
                    paramNumDisplay.textContent = paramNum.value;
                    paramNum.addEventListener("input", function() {
                        this.nextElementSibling.textContent = this.value;
                    });
                    typeSubmenu.appendChild(paramNum);
                    typeSubmenu.appendChild(paramNumDisplay);
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
    if (!(Object.keys(config[firstType]["parameters"]).length === 0)) {
        document.getElementById(firstType + "-submenu").style.display = "block";
    }
    selectElement.addEventListener("change", function () {
        let selectedValue = selectElement.options[selectElement.selectedIndex].value;
        for (var type of Object.keys(config)) {
            if (selectedValue === type && !(Object.keys(config[type]["parameters"]).length === 0)) {
                document.getElementById(type+"-submenu").style.display = "block";
            } else {
                document.getElementById(type+"-submenu").style.display = "none";
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
