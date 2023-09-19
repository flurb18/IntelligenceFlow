import OpenAI from 'openai';

export var apiFuncs = {
    OpenAI: function(_prompt, params) {
        const oa = new OpenAI({
            apiKey: OPENAI_API_KEY,
            dangerouslyAllowBrowser: true
        });
        return oa.chat.completions.create({
            messages: [{ role: "user", content: _prompt }],
            model: "gpt-3.5-turbo"
        }).then((response) => response.data.choices[0].message.content.trim());
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