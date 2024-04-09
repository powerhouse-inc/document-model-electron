FROM node:lts-alpine AS builder
ARG BASE_PATH="/alpha/makerdao/connect"
ENV BASE_PATH=${BASE_PATH}

WORKDIR /opt/app
COPY . .
RUN npm install -g husky vite
RUN npm install --frozen-lockfile
RUN npm run build:web -- --base ${BASE_PATH}

# Production image, copy all the files and run next
FROM nginx:latest AS runner

ARG X_TAG
WORKDIR /opt/app
ENV NODE_ENV=production
ENV BASE_PATH=${BASE_PATH}
COPY --from=builder /opt/app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf.template
CMD /bin/sh -c "envsubst '\$PORT,\$BASE_PATH' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf" && nginx -g 'daemon off;'