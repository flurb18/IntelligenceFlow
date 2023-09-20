import { resetBlock } from './utils.js';

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
        if (!block.hasClass("running")) {
            block.addClass("running");
            executeBlockQueue(block, state).then((out) => {
                block.removeClass("running");
            }).catch((reason) => {
                block.removeClass("running");
            });
        }
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

function executeBlockQueue(block, state) {
    if (state.cancel) {
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
                            queueItem["resolve"](executeOutput);
                            resetBlock(block);
                            resolve();
                        }).catch(error => {
                            queueItem["reject"](error);
                            resetBlock(block);
                            reject();
                        });
                    }, 500);
                } else {
                    block.scratch("queued-inputs", queuedInputs);
                    block.scratch("waiting-for", waitIds);
                    queueItem["resolve"]([{
                        done: false
                    }]);
                    resolve();
                }
            } else {
                block.data("default-input-queue").push(queueItem);
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
                    reject();
                });
            }, 500);
        }
    }).then((out) => {
        if (block.data("default-input-queue").length == 0 || !state.running || state.cancel) {
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