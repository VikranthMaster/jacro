FROM node:20-alpine

WORKDIR /backend
COPY package*.json ./
COPY middleware ./middleware
COPY utils ./utils
COPY server.js ./

RUN npm install
RUN npm install dotenv

CMD ["npm", "run", "dev"]



