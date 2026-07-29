# Angular 6 / Angular CLI 6.1 / TypeScript 2.9 require Node 10.x
FROM node:10.24.1-buster

WORKDIR /app

# Install deps first so this layer is cached until package*.json/.npmrc change
# .npmrc carries the @fortawesome auth token needed to fetch the Pro packages
COPY package.json package-lock.json .npmrc ./
RUN npm install

COPY . .

EXPOSE 4200

CMD ["npx", "ng", "serve", "vis-tool", "--base-href", "/vis-tool/", "--host", "0.0.0.0", "--poll", "2000", "--disable-host-check"]
