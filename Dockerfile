FROM node:22-alpine

WORKDIR /app

ADD . /app

RUN npm ci

RUN npm run build

ENTRYPOINT ["npm", "start"]
