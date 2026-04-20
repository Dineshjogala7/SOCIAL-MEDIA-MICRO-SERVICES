#use the official node.js 18 version image with alpine linux as the base image

FROM node:18-alpine

WORKDIR /use/src/app

COPY package*.json ./

#runnig only the prodcution packages not the dev dependencies
RUN npm ci --only=production 

COPY . .

EXPOSE 3003

CMD [ "node" , "src/server.js" ]