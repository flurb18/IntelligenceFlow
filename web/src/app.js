import { notify, createSubmenusByType } from './utils.js';
import { blockFuncs } from './blockfuncs.js';

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
    const blockTypesPromise = fetch("/src/blocktypes.json").then(response => response.json());
    const apiTypesPromise = fetch("/src/apitypes.json").then(response => response.json());
    const cytostylePromise = fetch("/styles/cytoscape-styles.json").then(response => response.json());

    Promise.all([blockTypesPromise, apiTypesPromise, cytostylePromise]).then(
        function (responses) {
            let blockTypes = responses[0];
            let apiTypes = responses[1];
            let cytostyle = responses[2];
            // Create block type submenus
            createSubmenusByType(blockTypes, document.getElementById("new-block-type"));
            createSubmenusByType(apiTypes, document.getElementById("api-settings-type"));
            // Create the cytoscape
            main(blockTypes, apiTypes, cytostyle);
        }
    );
});

function main(blockTypes, apiTypes, cytostyle) {
    // Run Cytoscape
    const cy = cytoscape({
        container: document.getElementById('flow-diagram'),
        zoom: 1,
        minZoom: 0.5,
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

    cy.on('cxttap', function (event) {
        if (event.target === cy || state.running) {
            if (state.selectedNode) {
                state.selectedNode.toggleClass("selected");
                state.selectedNode = null;
            }
        } else {
            if (event.target.isNode()) {
                if (state.selectedNode) {
                    if (!(state.selectedNode === event.target)) {
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
                        state.selectedNode.toggleClass("selected");
                        state.selectedNode = null;
                    }
                } else {
                    state.selectedNode = event.target;
                    state.selectedNode.toggleClass("selected");
                }
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
        var extent = cy.extent();
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
        var maxD = Math.floor(Math.min(extent.w, extent.h) / 6);
        cy.add([{
            group: 'nodes',
            data: _data,
            position: {
                x: ((extent.x1 + extent.x2) / 2) + Math.floor(Math.random() * 2 * maxD) - maxD,
                y: ((extent.y1 + extent.y2) / 2) + Math.floor(Math.random() * 2 * maxD) - maxD
            }
        }]);
        // Children nodes and block creation hook
        cy.add(blockFuncs[blockType].create(_data));
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
                    block.addClass("active");
                    waitIds.splice(idx, 1);
                    queuedInputs[srcId] = input;
                    if (waitIds.length == 0) {
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
            blockFuncs[blockType].exec(input, block.data(), resolve, reject);
        });
    }

    function resetBlock(block) {
        block.removeClass("active");
        block.scratch({
            "waiting-for": [...block.data("waits-for")],
            "queued-inputs": {}
        });
    }

    function reset() {
        cy.nodes().forEach((block) => {
            resetBlock(block);
        });
    }

    function getBlocksOfType(blockType) {
        return cy.nodes('[id ^= "' + blockType+'"]');
    }
}

