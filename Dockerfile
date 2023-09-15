FROM node as builder
ADD ./package.json /build/package.json
WORKDIR /build
RUN npm install
ADD . /build
RUN npx webpack


FROM node
COPY --from=builder /build/dist /web
ADD ./package.json /web/package.json
WORKDIR /web
CMD npm start