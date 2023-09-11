FROM node

ADD ./web /web

WORKDIR /web
RUN npm install

CMD cd /web && npm start
