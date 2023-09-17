import asyncio
import aiohttp
from playwright.async_api import async_playwright

from aiohttp import web

async def handle_post(request):
    data = await request.post()
    response = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        async def on_load():
            for expand in await page.locator(".sidebar-submenu-expand-button"):
                await expand.click()
            await page.locator("#import-file").set_input_files(
                files=[
                    {"name": "flow.json", "mimeType": "application/json;charset=utf-8", "buffer": json.dumps(data["json"]).encode("utf-8")}
                ]
            )
            await page.locator("#import-submit").click()
            apiType = data["api"]["type"]
            await page.locator("#api-settings-type").selectOption(apiType)
            if apiType == "Oobabooga":
                await page.locator("#Oobabooga-submenu-Oobabooga-URL").fill(data["api"]["Oobabooga-URL"])
            elif apiType == "OpenAI":
                await page.locator("#OpenAI-submenu-OpenAI-APIkey").fill(data["api"]["OpenAI-APIkey"])
            for i in range(len(data["inputs"])):
                await page.locator(f"#INPUT{i}-input").fill(data["inputs"][i])
            await page.locator("#execute-form-submit").click()

        await page.goto("file:///api/web/index.html")
        await page.once("load", on_load)
        async with page.expect_event("flowExecutionDone") as event_info:
            for output_element in await page.locator("textarea[id$='-output']").all():
                response[output_element.id().removesuffix("-output")] = output_element.input_value()
        await browser.close()
    response_data = {
        'message': 'Output from Flow',
        'data': response
    }
    return web.json_response(response_data)

app = web.Application()
app.router.add_post('/api', handle_post)

web.run_app(app, port=9900)
