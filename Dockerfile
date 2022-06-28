FROM node:16
RUN mkdir /app

WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app

EXPOSE 8081

CMD ["node", "index.js"]