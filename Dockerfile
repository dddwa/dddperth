# base node image
FROM node:20-bullseye-slim AS base

# set for base and all layer that inherit from it
ENV NODE_ENV=production

RUN npm install -g pnpm

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /myapp

ADD website/package.json pnpm-lock.yaml .npmrc /myapp/
RUN pnpm install --prod

ADD ./website/build /myapp
ADD ./website/public /myapp/public

EXPOSE 3800

CMD ["node", "./server/server.js"]
