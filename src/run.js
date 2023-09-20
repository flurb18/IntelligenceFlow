import { resetBlock } from './utils.js';

import { blockFuncs } from './blockfuncs.js';

export function activateBlock(input, block, srcId, state) {
    if (state.cancel) {
        return new Promise((resolve, reject) => reject("Stopped"));
    }
    return new Promise((resolve, reject) => {
        if (!(block.data("waits-for").length == 0)) {
            var waitIds = [...block.scratch("waiting-for")];
            var queuedInputs = block.scratch("queued-inputs");
            var idx = waitIds.indexOf(srcId);
            if (idx > -1) {
                block.addClass("waiting");
                waitIds.splice(idx, 1);
                queuedInputs[srcId] = input;
                if (waitIds.length == 0) {
                    block.removeClass("waiting")
                    block.addClass("active");
                    setTimeout(() => {
                        executeBlock(queuedInputs, block, state).then(executeOutput => {
                            resolve(executeOutput);
                            resetBlock(block);
                        }).catch(error => {
                            reject(error);
                            resetBlock(block);
                        });
                    }, 500);
                } else {
                    block.scratch("queued-inputs", queuedInputs);
                    block.scratch("waiting-for", waitIds);
                    resolve([{
                        done: false
                    }]);
                }
            } else {
                console.log("Waiting block" + block.id() + " got extra input");
            }
        } else {
            block.data("default-input-queue").push({
                "input": input,
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
    return new Promise((resolve, reject) => {
        const queueItem = block.data("default-input-queue").shift();
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
    }).then((out) => {
        if (block.data("default-input-queue").length == 0) {
            return Promise.resolve();
        } else {
            return executeBlockQueue(block, state);
        }
    });
}

function executeBlock(input, block, state) {
    if (state.cancel) {
        return new Promise((resolve, reject) => reject("Stopped"));
    }
    return new Promise((resolve, reject) => {
        var blockType = block.data("block-type");
        // Run block
        blockFuncs[blockType].exec(input, block.data(), state, resolve, reject);
    });
}