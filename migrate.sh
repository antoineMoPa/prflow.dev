#!/bin/bash

docker exec $(docker ps | grep 3333 | cut -d" " -f1)  sh -c 'npm run db:migrate'
