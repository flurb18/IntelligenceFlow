FROM node

ADD ./web/package.json /web/package.json

WORKDIR /web
RUN npm install

ADD ./web /web

RUN npx webpack

CMD cd /web && npm start
