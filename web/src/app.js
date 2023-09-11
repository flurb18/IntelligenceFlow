document.addEventListener('DOMContentLoaded', function() {
  const cy = cytoscape({
    container: document.getElementById('flow-diagram'),
    zoom: 1,
    minZoom: 0.2,
    maxZoom: 5,
    elements: [
      { data: { id: 'Input' } },
      { data: { id: 'Output' } },
      { data: { id: 'ab', source: 'a', target: 'b' } }
    ],
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(id)'
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
      }
    ],
    layout: { name: 'grid' }
  });
});

const blockTypes = {
    "INPUT" : {
        "parameters" : {
            "INPUT-type" : {
                "label" : "Type of Input",
                "type" : "choice",
                "choices" : ["Input Text", "Choose File"]
            },
            "INPUT-text" : {
                "label" : "Input Text",
                "type" : "text"
            },
            "INPUT-file" : {
                "label" : "Input File",
                "type" : "file"
            }
        }
    },
    "OUTPUT" : {
        "parameters" : {
            "OUTPUT-type" : {
                "label" : "Type of Output",
                "type" : "choice",
                "choices" : ["Output In Browser"]
            }
        }
    },
    "SPLIT" : {
        "parameters" : {
            "SPLIT-chunk-size" : {
                "label" : "Chunk Size",
                "type" : "num",
                "min" : "0",
                "max" : "100"
            },
            "SPLIT-chunk-overlap" : {
                "label" : "Chunk Overlap",
                "type" : "num",
                "min" : "0",
                "max" : "100"
            }
        }
    },
    "COMBINE" : {
        "parameters" : {
            
        }
    }
}

for (var blockType of Object.keys(blockTypes)) {
    // Create option in dropdown
    var blockTypeOption = document.createElement("option");
    blockTypeOption.setAttribute("value", blockType);
    blockTypeOption.innerText = blockType;
    document.getElementById("new-block-type").appendChild(blockTypeOption);
    // Create form for type
    var blockTypeForm = document.createElement("form");
    blockTypeForm.setAttribute("id", "new-block-" + blockType + "-submenu");
    blockTypeForm.setAttribute("name", blockType);
    blockTypeForm.setAttribute("class", "new-block-type-submenu");
    let params = blockTypes[blockType]["parameters"];
    for (var param of Object.keys(params)) {
        switch (params[param]["type"]) {
            //Dropdown menu
            case "choice":
                var paramLabel = document.createElement("label");
                paramLabel.setAttribute("for", param);
                paramLabel.innerText = params[param]["label"];
                var paramChoice = document.createElement("select");
                paramChoice.setAttribute("id", param);
                paramChoice.setAttribute("name", param);
                for (var choice of params[param]["choices"]) {
                    var paramChoiceOption = document.createElement("option");
                    paramChoiceOption.setAttribute("value", choice);
                    paramChoiceOption.innerText = choice;
                    paramChoice.appendChild(paramChoiceOption);
                }
                blockTypeForm.appendChild(paramLabel);
                blockTypeForm.appendChild(paramChoice);
                break;
            //Textbox
            case "text":
                var paramLabel = document.createElement("label");
                paramLabel.setAttribute("for", param);
                paramLabel.innerText = params[param]["label"];
                var paramText = document.createElement("input");
                paramText.setAttribute("id", param);
                paramText.setAttribute("name", param);
                paramText.setAttribute("type", "text");
                blockTypeForm.appendChild(paramLabel);
                blockTypeForm.appendChild(paramText);
                break;
            //Numeric input
            case "num":
                var paramLabel = document.createElement("label");
                paramLabel.setAttribute("for", param);
                paramLabel.innerText = params[param]["label"];
                var paramNum = document.createElement("input");
                paramNum.setAttribute("id", param);
                paramNum.setAttribute("name", param);
                paramNum.setAttribute("type", "range");
                paramNum.setAttribute("min", params[param]["min"]);
                paramNum.setAttribute("max", params[param]["max"]);
                blockTypeForm.appendChild(paramLabel);
                blockTypeForm.appendChild(paramNum);
                break;
            case "file":
                break;
            default:
                break;
        }
    }
    document.getElementById("new-block-form").appendChild(blockTypeForm);
}

var newBlockTypePicker = document.getElementById("new-block-type");
newBlockTypePicker.addEventListener("change", function () {
    let selectedValue = newBlockTypePicker.options[newBlockTypePicker.selectedIndex].value;
    let subForms = document.getElementsByClassName("new-block-type-submenu");
    for (let i = 0; i < subForms.length; i += 1) {
        if (selectedValue === subForms[i].name) {
          subForms[i].setAttribute('style', 'display:block');
        } else {
          subForms[i].setAttribute('style', 'display:none');
        }
    }
});
