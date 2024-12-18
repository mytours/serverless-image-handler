export AWS_REGION = ap-southeast-2

DOCKER_PLATFORM := linux/amd64
AWS_ACCOUNT_ID  := 679173355480
ECR_REGISTRY    := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com

all: clean imagehandler-0.10.0.zip
.PHONY: all

clean:
	rm -rf dist imagehandler-*.zip source/constructs/cdk.out source/constructs/template.json
.PHONY: clean

login:
	aws --region $(AWS_REGION) ecr get-login-password | docker login --username AWS --password-stdin $(ECR_REGISTRY)
.PHONY: login

imagehandler: TAG=0.10.0
imagehandler: source/**/*
	docker buildx build --pull --load --progress plain --platform $(DOCKER_PLATFORM) --tag $(ECR_REGISTRY)/imagehandler:$(TAG) .
.PHONY: imagehandler

source/constructs/template.json:
	cd source/constructs && npm run clean:install && overrideWarningsEnabled=false npx cdk synth --json > template.json

dist: source/constructs/template.json
	cp -R source/constructs/cdk.out/$(shell jq -r '.Resources[] | select(.Metadata."aws:cdk:path" == "ServerlessImageHandlerStack/BackEnd/ImageHandlerLambdaFunction/Resource") .Metadata."aws:asset:path"' source/constructs/template.json)/ dist

imagehandler-%.zip: dist
	cd dist && zip -r ../$@ . && cd ..
