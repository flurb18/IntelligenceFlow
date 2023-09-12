FROM node

ADD ./web/package.json /web/package.json

WORKDIR /web
RUN npm install

ADD ./web /web

CMD cd /web && npm start
