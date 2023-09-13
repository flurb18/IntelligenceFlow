export var blockFuncs = {
    "INPUT": {
        exec: function (input, blockData, resolve, reject) {
            resolve(input);
        },
        create: function(blockData) {
            var inputIdString = blockData.id + "-input";
            var inputElement = document.createElement("textarea");
            inputElement.setAttribute("id", inputIdString);
            inputElement.setAttribute("name", inputIdString);
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", inputIdString);
            labelElement.innerText = blockData.label;
            var submitButton = document.getElementById("execute-form-submit");
            insertBefore(labelElement, submitButton);
            insertBefore(inputElement, submitButton);
            insertBefore(document.createElement("br"), submitButton);
        },
        destroy: function(blockData) {

        }
    },
    "INPUT-FIXED": {
        exec: function (input, blockData, resolve, reject) {
            resolve(input);
        },
        create: function(blockData) {

        },
        destroy: function(blockData) {
            
        }
    },
    "OUTPUT": {
        exec: function (input, blockData, resolve, reject) {
            document.getElementById(blockData.id + "-output").value = input;
            resolve();
        },
        create: function(blockData) {
            var outputIdString = blockData.id + "-output";
            var outputElement = document.createElement("textarea");
            outputElement.setAttribute("id", outputIdString);
            outputElement.setAttribute("name", outputIdString);
            outputElement.readOnly = true;
            var labelElement = document.createElement("label");
            labelElement.setAttribute("for", outputIdString);
            labelElement.innerText = blockData.label;
            var outputDiv = document.getElementById("output-div");
            outputDiv.appendChild(labelElement);
            outputDiv.appendChild(outputElement);
            outputDiv.appendChild(document.createElement("br"));
        },
        destroy: function(blockData) {
            
        }
    },
    "COPY": {
        exec: function (input, blockData, resolve, reject) {
            var numCopies = blockData.parameters["COPY-num-copies"];
            resolve(Array(numCopies).fill(input));
        },
        create: function(blockData) {

        },
        destroy: function(blockData) {
            
        }
    },
    "SPLIT": {
        exec: function (input, blockData, resolve, reject) {
            resolve(input);
        },
        create: function(blockData) {

        },
        destroy: function(blockData) {
            
        }
    },
    "COMBINE": {
        exec: function (input, blockData, resolve, reject) {
            resolve(input.join(" "));
        },
        create: function(blockData) {

        },
        destroy: function(blockData) {
            
        }
    },
    "LLM": {
        exec: function (input, blockData, resolve, reject) {
            resolve(input);
        },
        create: function(blockData) {

        },
        destroy: function(blockData) {
            
        }
    }
};