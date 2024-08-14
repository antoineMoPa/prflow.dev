#!/bin/bash

docker stop $(docker ps | grep 3333 | cut -d" " -f1)

set -e

git pull origin main

docker build -t prflow.dev .

docker run  -p 3333:3333 -v $HOME/prisma/:/app/hostprisma/ -t prflow.dev -d
