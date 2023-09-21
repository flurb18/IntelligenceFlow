import { blockFuncs } from './blockfuncs.js';

export function activateBlock(input, block, srcId, state) {
    if (state.cancel || !state.running) {
        return new Promise((resolve, reject) => reject("Stopped"));
    }
    return new Promise((resolve, reject) => {  
        block.data("default-input-queue").push({
            "input": input,
            "from": srcId,
            "resolve": resolve,
            "reject": reject
        });
        runBlock(block, state);
    }).then((statuses) => {
        var activationPromises = [];
        statuses.forEach((status) => {
            if (status.done) {
                if (status.hasOwnProperty("for")) { 
                    activationPromises.push(activateBlock(status.output, block.cy().getElementById(status.for), block.id(), state));
                } else {
                    block.outgoers('node').forEach((outNeighbor) => {
                        activationPromises.push(activateBlock(status.output, outNeighbor, block.id(), state));
                    });
                }
            }
        });
        return Promise.all(activationPromises);
    });
}

function runBlock(block, state) {
    if (!block.hasClass("running")) {
        block.addClass("running");
        executeBlockQueue(block, state).then((out) => {
            block.removeClass("running");
        }).catch((reason) => {
            block.removeClass("running");
        });
    }
}

function executeBlockQueue(block, state) {
    if (state.cancel || !state.running) {
        return new Promise((resolve, reject) => reject("Stopped"));
    }
    return new Promise((resolve, reject) => {
        const queueItem = block.data("default-input-queue").shift();
        if (!(block.data("waits-for").length == 0)) {
            var waitIds = [...block.scratch("waiting-for")];
            var queuedInputs = block.scratch("queued-inputs");
            var idx = waitIds.indexOf(queueItem["from"]);
            if (idx > -1) {
                block.addClass("waiting");
                waitIds.splice(idx, 1);
                queuedInputs[queueItem["from"]] = queueItem["input"];
                if (waitIds.length == 0) {
                    block.removeClass("waiting")
                    block.addClass("active");
                    setTimeout(() => {
                        executeBlock(queuedInputs, block, state).then(executeOutput => {
                            block.removeClass("active");
                            queueItem["resolve"](executeOutput);
                            block.scratch({
                                "waiting-for": [...block.data("waits-for")],
                                "queued-inputs": {}
                            });
                            var extras = JSON.parse(JSON.stringify(block.data("waiting-extra-input-queue")));
                            block.data("default-input-queue", extras);
                            block.data("waiting-extra-input-queue", []);
                            if (extras.length > 0) {
                                runBlock(block, state);
                            }
                            resolve();
                        }).catch(error => {
                            block.removeClass("active");
                            queueItem["reject"](error);
                            block.scratch({
                                "waiting-for": [...block.data("waits-for")],
                                "queued-inputs": {}
                            });
                            block.data("default-input-queue", []);
                            block.data("waiting-extra-input-queue", []);
                            reject(error);
                        });
                    }, parseInt(state.animationDelay));
                } else {
                    block.scratch("queued-inputs", queuedInputs);
                    block.scratch("waiting-for", waitIds);
                    queueItem["resolve"]([{
                        done: false
                    }]);
                    resolve();
                }
            } else {
                block.data("waiting-extra-input-queue").push(queueItem);
                resolve();
            }
        } else { 
            block.addClass("active");
            setTimeout(() => {
                executeBlock(queueItem["input"], block, state).then(executeOutput => {
                    block.removeClass("active");
                    queueItem["resolve"](executeOutput);
                    resolve();
                }).catch(error => {
                    block.removeClass("active");
                    queueItem["reject"](error);
                    reject(error);
                });
            }, parseInt(state.animationDelay));
        }
    }).then((out) => {
        if (block.data("default-input-queue").length == 0) {
            return Promise.resolve();
        } else {
            return executeBlockQueue(block, state);
        }
    });
}

function executeBlock(input, block, state) {
    if (state.cancel || !state.running) {
        return new Promise((resolve, reject) => reject("Stopped"));
    }
    return new Promise((resolve, reject) => {
        var blockType = block.data("block-type");
        // Run block
        blockFuncs[blockType].exec(input, block.data(), state, resolve, reject);
    });
}