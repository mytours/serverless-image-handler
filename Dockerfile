FROM public.ecr.aws/lambda/nodejs:20 AS builder

RUN dnf -y install rsync git jq zip

ENV SHARP_INSTALL_FORCE=true \
  npm_config_sharp_libvips_binary_host=https://stqry-libvips.s3.ap-southeast-2.amazonaws.com \
  npm_config_sharp_binary_host=https://stqry-libvips.s3.ap-southeast-2.amazonaws.com

WORKDIR /srv/source/image-handler/

# Check for jpeg2000 support
COPY source/image-handler/package.json source/image-handler/package-lock.json /srv/source/image-handler/
RUN npm ci
RUN node -e "process.exit(require('sharp').format.jp2k.input.file ? 0 : 1)"

COPY . /srv/
WORKDIR /srv/source/constructs
RUN npm run clean:install
RUN overrideWarningsEnabled=false npx cdk synth --json > template.json
RUN cp -R cdk.out/$(jq -r '.Resources[] | select(.Metadata."aws:cdk:path" == "ServerlessImageHandlerStack/BackEnd/ImageHandlerLambdaFunction/Resource") .Metadata."aws:asset:path"' template.json)/ /dist

FROM public.ecr.aws/lambda/nodejs:20

COPY --from=builder /dist/ /var/task/

CMD ["index.handler"]
