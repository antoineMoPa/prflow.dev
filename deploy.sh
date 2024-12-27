#!/bin/bash

set -e

git pull origin main

docker build -t prflow.dev .

docker system prune -f

container_id=$(docker ps | grep 3333 | cut -d" " -f1)
if [ -n "$container_id" ]; then
  docker stop "$container_id"
fi

docker run -d -p 3333:3333 -v $HOME/prisma/:/app/hostprisma/ -t prflow.dev

