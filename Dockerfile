FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm run build

FROM nginx
COPY --from=builder /build/dist /usr/share/nginx/html
