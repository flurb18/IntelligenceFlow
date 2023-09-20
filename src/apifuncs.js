export var apiFuncs = {
    OpenAI: function(_prompt, params) {
        var request = {
            model: OPENAI_MODEL,
            prompt: _prompt,
            temperature: params["LLM-temperature"],
            max_tokens: params["LLM-max-new-tokens"],
            n: 1
        }
        var url = "https://api.openai.com/v1/chat/completions";
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer "+ OPENAI_API_KEY
            },
            body: JSON.stringify(request)
        }).then((response) => response.json()).then((responseJSON) => {
            return responseJSON["choices"][0]["message"]["content"];
        });
    },
    Oobabooga: function(_prompt, params) {
        var request = {
            prompt: _prompt,
            temperature: params["LLM-temperature"],
            max_new_tokens: params["LLM-max-new-tokens"]
        };
        var url = OOBABOOGA_API_URL;
        if (!url.endsWith("/api/v1/generate") || !url.endsWith("/api/v1/generate/")) {
            url = url + "/api/v1/generate";
        }
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request)
        }).then((response) => response.json()).then((responseJSON) => {
            var _output = "";
            for (var result of responseJSON["results"]) {
                _output += result["text"];
            }
            return _output;
        });
    },
    KoboldCPP: function(_prompt, params) {
        var request = {
            prompt: _prompt,
            temperature: params["LLM-temperature"],
            max_new_tokens: params["LLM-max-new-tokens"]
        };
        var url = params["KoboldCPP-URL"];
        if (!url.endsWith("/api/v1/generate") && !url.endsWith("/api/v1/generate/")) {
            url = url + "/api/v1/generate";
        }
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request)
        }).then((response) => response.json()).then((responseJSON) => {
            var _output = "";
            for (var result of responseJSON["results"]) {
                _output += result["text"];
            }
            return _output;
        });
    }
}