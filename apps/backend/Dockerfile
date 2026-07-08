# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS build
WORKDIR /src

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# CGO-free static build
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget
WORKDIR /app
COPY --from=build /out/server /app/server
COPY db/migrations /app/db/migrations

ENV APP_PORT=8081
EXPOSE 8081

ENTRYPOINT ["/app/server"]
