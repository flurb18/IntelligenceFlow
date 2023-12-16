import sys
import os
import asyncio
import aiohttp
from aiohttp import web
import html
import json
import dotenv
import argparse
  
parser = argparse.ArgumentParser()
 
parser.add_argument("-a", "--api", help = "Enable API", action="store_true")
requiredNamed = parser.add_argument_group('required named arguments')
requiredNamed.add_argument('-b', '--host', help='Host IP to bind to', required=True)
requiredNamed.add_argument("-p", "--port", help = "Port to bind to", required=True)
args = parser.parse_args()
if (args.api):
    from playwright.async_api import async_playwright

dotenv.load_dotenv()
cfg = {
    "OpenAI": {
        "enabled": not(os.environ.get("OPENAI_ENABLE") is None),
        "APIKey": os.environ.get("OPENAI_API_KEY"),
        "model": os.environ.get("OPENAI_MODEL")
    },
    "Oobabooga": {
        "enabled": not(os.environ.get("OOBABOOGA_ENABLE") is None),
        "APIURL": os.environ.get("OOBABOOGA_API_URL")
    },
    "KoboldCPP": {
        "enabled": not(os.environ.get("KOBOLDCPP_ENABLE") is None),
        "APIURL": os.environ.get("KOBOLDCPP_API_URL")
    }
}

enabled_apis = []
for key in cfg.keys():
    if (cfg[key]["enabled"]):
        enabled_apis.append(key)

async def handle_runflow_post(request):
    data = await request.json()
    response = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        async def on_load():
            for expand in await page.locator(".sidebar-submenu-expand-button").all():
                await expand.click()
            await page.locator("#import-file").set_input_files(
                files=[
                    {"name": "flow.json", "mimeType": "application/json;charset=utf-8", "buffer": json.dumps(data["json"]).encode("utf-8")}
                ]
            )
            await page.locator("#import-submit").click()
            await page.locator("#settings-animation-delay").fill(str(1))
            await page.locator("#settings-submit").click()
            for i in range(len(data["inputs"])):
                await page.locator(f"#INPUT{i+1}-input").fill(data["inputs"][i])
            await page.locator("#execute-form-submit").click()

        async def accept_dialog(dialog):
            await dialog.accept()

        page.on('dialog', accept_dialog)
        page.once("load", on_load)
        await page.goto(f"http://localhost:{args.port}/")
        async with page.expect_console_message() as msg_info:
            msg = await msg_info.value
        print(msg.text, flush=True)
        if (msg.text == "Done!"):
            for output_element in await page.locator("textarea[id$='-output']").all():
                id = await output_element.evaluate("node => node.id")
                response[id.removesuffix("-output")] = await output_element.input_value()
        await browser.close()
    response_data = {
        'message': 'Output from Flow',
        'data': response
    }
    return web.json_response(response_data)

async def handle_llm_post(request):
    api_endpoint = ""
    api_request_data = {}
    api_request_headers = { "Content-Type": "application/json"}
    request_data = await request.json()

    if request_data["type"] == "OpenAI" or request_data["type"] == "Oobabooga":
        api_endpoint = "https://api.openai.com" if request_data["type"] == "OpenAI" else cfg["Oobabooga"]["APIURL"]
        if not(api_endpoint.endswith("/v1/chat/completions") or api_endpoint.endswith("/v1/chat/completions/")):
            api_endpoint += "/v1/chat/completions"
        api_request_data = {
            "messages": [{"role": "user", "content": request_data["prompt"]}],
            "temperature":  request_data["temperature"],
            "max_tokens": request_data["max_new_tokens"],
            "n": 1,
            "mode" : "instruct"
        }
        if request_data["type"] == "OpenAI":
            api_request_data["model"] = cfg["OpenAI"]["model"]
            api_request_headers["Authorization"] = f"Bearer {cfg.OpenAI.APIKey}"
    elif request_data["type"] == "KoboldCPP":
        api_endpoint = cfg[request_data["type"]]["APIURL"]
        if not(api_endpoint.endswith("/api/v1/generate") or api_endpoint.endswith("/api/v1/generate/")):
            api_endpoint += "/api/v1/generate"
        api_request_data = {
            "prompt": request_data["prompt"],
            "temperature": request_data["temperature"],
            "max_new_tokens": request_data["max_new_tokens"],
            "truncation_length": request_data["max_prompt_tokens"]
        }
    else:
        print("Invalid API requested", flush=True)
        return web.HTTPBadRequest()
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(api_endpoint, json=api_request_data, headers=api_request_headers) as response:
                api_response = await response.json()
        except Exception as e:
            return web.json_response({"error": str(e)})
    try:
        if request_data["type"] == "OpenAI":            
                return web.json_response({"output": api_response["choices"][0]["message"]["content"]})
        elif request_data["type"] == "Oobabooga" and request_data["use_instruct"] == "true":
                return web.json_response({"output": "\n".join([html.unescape(result["history"]["visible"][-1][1]) for result in api_response["results"]])})
        else:
                return web.json_response({"output": "\n".join([result["text"] for result in api_response["results"]])})
    except Exception as e:
            return web.json_response({"error": str(e)})

async def redirect_to_index(request):
    raise web.HTTPMovedPermanently('/index.html')

async def handle_config(request):
    return web.json_response({"enabled": enabled_apis})

app = web.Application()
app.router.add_get('/', redirect_to_index)
app.router.add_get('/config.json', handle_config)
app.router.add_static('/', "./dist")
app.router.add_post('/api/llm', handle_llm_post)
if (args.api):
    app.router.add_post('/api/runflow', handle_runflow_post)

web.run_app(app, host=args.host, port=args.port)
