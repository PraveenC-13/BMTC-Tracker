FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY backend-go/go.mod backend-go/go.sum ./
RUN go mod download

COPY backend-go/*.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /app/server ./server

# Copy frontend into the location expected by the Go backend
COPY frontend /frontend

EXPOSE 8080

CMD ["./server"]