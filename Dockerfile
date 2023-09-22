FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm run build

FROM python
ARG API=""
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp
RUN [ ! -z "$API" ] && pip install playwright && \
    playwright install && \
    playwright install-deps
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/
ADD ./server.py /app/
WORKDIR /app
ENV E_API="$API"
CMD python server.py $([ ! -z "$E_API" ] && echo "--api") --host "0.0.0.0" --port "9900"
