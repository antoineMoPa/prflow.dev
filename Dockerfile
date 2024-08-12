FROM node:22-alpine

WORKDIR /app

ADD . /app

ENV NODE_OPTIONS "--max_old_space_size=512 --trace-warnings"

RUN npm ci
RUN npm run build

ENTRYPOINT ["npm", "start"]
