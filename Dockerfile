FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm run build

FROM python:3.12 as api
RUN pip install --upgrade pip &&
    pip install playwright asyncio aiohttp &&
    playwright install
ADD ./api/ /api
RUN mkdir /api/web
COPY --from=builder /build/dist /api/web/
WORKDIR /api
CMD python server.py

FROM nginx
COPY --from=builder /build/dist /usr/share/nginx/html