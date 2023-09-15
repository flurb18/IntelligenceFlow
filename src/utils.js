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

// Creates submenus that are only visisble according to the choice of selectElement, according to the config object.
// config should consist of string:object pairs, where the string is an option to be added to selectElement, and the object
// describes the submenu to be created. The object should have an entry "parameters" mapping to an object of string:object pairs,
// where this object has an entry "label" and an entry "type". "type" should be in choice,text,num,file. "label" is what goes next to
// the field in the submenu.
export function createSubmenusByType(config, selectElement) {
    for (var type of Object.keys(config)) {
        if (config[type]["hidden"]) {
            continue;
        }
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
                    paramNum.setAttribute("value", params[param]["default"]);
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