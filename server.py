import sys
import os
import asyncio
import aiohttp
from aiohttp import web
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

async def handle_api_post(request):
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

async def redirect_to_index(request):
    raise web.HTTPMovedPermanently('/index.html')

async def handle_config(request):
    return web.json_response(cfg)

app = web.Application()
app.router.add_get('/', redirect_to_index)
app.router.add_get('/config.json', handle_config)
app.router.add_static('/', "./dist")
if (args.api):
    app.router.add_post('/api', handle_api_post)

web.run_app(app, host=args.host, port=args.port)
