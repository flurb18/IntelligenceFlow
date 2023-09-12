import './utils.js';


const blockTypes_backup = {
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

let blockTypes;
fetch("/src/blocktypes.json").then(response => response.json()).then(json => blockTypes = json);
let apiTypes;
fetch("/src/apitypes.json").then(response => response.json()).then(json => apiTypes = json);

const apiTypes_backup = {
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
        var inputLabel = newBlockForm.elements["new-block-label"].value;
        var label = inputLabel ? idString + "-" + inputLabel : idString;
        var _data = {
            "id": idString,
            "label": label,
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
        if (blockType === "INPUT") {
            inputIdString = idString+"-input";
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
