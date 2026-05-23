FROM node:20-alpine AS builder
WORKDIR /frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /frontend
COPY --from=builder /frontend/.next ./.next 
COPY --from=builder /frontend/public ./public
COPY --from=builder /frontend/package*.json ./ 
RUN npm install --production

CMD ["npm", "start"]
