FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm run build

FROM python as api
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp
RUN pip install playwright && \
    playwright install && \
    playwright install-deps
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/
ADD ./server.py /app/
WORKDIR /app
RUN touch /etc/hosts && echo "nginx-proxy dserver.me" >> /etc/hosts
CMD python server.py --api --host "0.0.0.0" --port "9900"

FROM python
RUN pip install --upgrade pip && \
    pip install asyncio aiohttp
RUN mkdir /app
COPY --from=builder /build/dist /app/dist/
ADD ./server.py /app/
WORKDIR /app
CMD python server.py --host "0.0.0.0" --port "9900"
