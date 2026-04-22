FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y python3 make g++ \
    && npm install \
    && apt-get clean

COPY . .

CMD ["npm", "start"]