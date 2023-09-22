FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm run build

FROM python
ARG API=""
ARG HOST="localhost"
ARG PORT="9900"
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp
RUN if [[ -z "$API" ]]; then pip install playwright && \
    playwright install && \
    playwright install-deps; fi
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/
ADD ./server.py /app/
WORKDIR /app
CMD python server.py $(if [[-z "$API"]]; then echo "--api"; fi) --host "$HOST" --port "$PORT"
