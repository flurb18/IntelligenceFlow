FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm run build

FROM python as stage
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp python-dotenv
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/

FROM python as api-stage
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp python-dotenv playwright && \
    playwright install && \
    playwright install-deps
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/

FROM api-stage as api
ADD ./server.py /app/
ADD ./.env /app/
WORKDIR /app
CMD python server.py --api --host "0.0.0.0" --port "9900"

FROM stage
ADD ./server.py /app/
ADD ./.env /app/
WORKDIR /app
CMD python server.py --host "0.0.0.0" --port "9900"