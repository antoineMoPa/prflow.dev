#!/bin/bash

git pull origin main

docker build -t prflow.dev .

docker run  -p 3333:3333 -v $HOME/prisma:/app/prisma -t prflow.dev
