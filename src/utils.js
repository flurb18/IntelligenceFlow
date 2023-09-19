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

// Notify the user of text
export function notify(text) {
    document.getElementById("notification-text").innerText = text;
    document.getElementById("notification").style.display = "block";
    setTimeout(function () {
        document.getElementById("notification").style.display = "none";
    }, 4000);
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
                paramNum.setAttribute("value", parameters[param]["default"]);
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
        if (type === "global-parameters") {
            continue;
        }
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
        if (config.hasOwnProperty("global-parameters")) {
            var typeGlobalParams = {};
            for (var key of Object.keys(config["global-parameters"])) {
                typeGlobalParams[type + "-" + key] = config["global-parameters"][key];
            }
            addParametersToMenu(typeGlobalParams, typeSubmenu, null);
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