# FROM scratch
#FROM gcr.io/distroless/static:nonroot
FROM docker-registry.local.892048.xyz/alpine:latest
# FROM gengweifeng/gcr-io-distroless-static-nonroot
ARG TARGETARCH
RUN apk add curl
COPY bin/service-database-$TARGETARCH /manager
EXPOSE 9090
USER 65532:65532

ENTRYPOINT ["/manager"]
