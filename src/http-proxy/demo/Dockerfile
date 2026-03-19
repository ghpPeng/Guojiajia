FROM node:20-alpine
WORKDIR /app
COPY mock-gateway.js .
RUN npm install ws
EXPOSE 8080
CMD ["node", "mock-gateway.js"]
