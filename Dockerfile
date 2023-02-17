FROM node:latest as build

ADD . .

RUN npm i
RUN npm run build

FROM node:latest

COPY --from=build ./dist ./dist
COPY --from=build ./package.json .

RUN npm install --omit=dev
EXPOSE 3000
ENV API_PORT=3000

CMD npm run start
