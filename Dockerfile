FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm run build

FROM python:3.11-slim as api
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp python-dotenv beautifulsoup4 playwright && \
    playwright install && \
    playwright install-deps
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/
ADD ./server.py /app/
ADD ./.env /app/
WORKDIR /app
CMD python server.py --api --host "0.0.0.0" --port "9900"

FROM python:3.11-slim
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp python-dotenv beautifulsoup4
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/
ADD ./server.py /app/
ADD ./.env /app/
WORKDIR /app
CMD python server.py --host "0.0.0.0" --port "9900"