FROM bohendo/graph-node:cf12d4d

RUN mkdir -p /app
WORKDIR /app

RUN apk add --update --no-cache bash curl jq

COPY ops ops
COPY build build

ENTRYPOINT ["bash", "ops/entry.sh"]
