FROM golang:1.21-alpine AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/sipla-api .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S app \
    && adduser -S -G app app

WORKDIR /app
COPY --from=builder /out/sipla-api /app/sipla-api
RUN mkdir -p /app/assets && chown -R app:app /app

USER app
EXPOSE 8080

CMD ["/app/sipla-api"]
