#!/bin/bash

set -e

git pull origin main

docker stop $(docker ps | grep 3333 | cut -d" " -f1)

docker build -t prflow.dev .

docker run  -p 3333:3333 -v $HOME/prisma/:/app/hostprisma/ -t prflow.dev -d
