FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npm build


FROM node
COPY --from=builder /build/dist /web
WORKDIR /web
RUN npm install
CMD npm start