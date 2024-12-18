// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const mockAwsS3 = {
  headObject: jest.fn(),
  copyObject: jest.fn(),
  getObject: jest.fn(),
  putObject: jest.fn(),
  headBucket: jest.fn(),
  createBucket: jest.fn(),
  putBucketEncryption: jest.fn(),
  putBucketPolicy: jest.fn(),
};

jest.mock("aws-sdk/clients/s3", () => jest.fn(() => ({ ...mockAwsS3 })));

export const mockAwsSecretManager = {
  getSecretValue: jest.fn(),
};

jest.mock("aws-sdk/clients/secretsmanager", () => jest.fn(() => ({ ...mockAwsSecretManager })));

export const mockAwsRekognition = {
  detectFaces: jest.fn(),
  detectModerationLabels: jest.fn(),
};

jest.mock("aws-sdk/clients/rekognition", () => jest.fn(() => ({ ...mockAwsRekognition })));

export const consoleInfoSpy = jest.spyOn(console, "info");

export const defaultEvent = {
  version: "2.0",
  routeKey: "$default",
  rawQueryString: "",
  rawPath: "",
  headers: {},
  isBase64Encoded: false,
  requestContext: {
    accountId: "",
    apiId: "",
    domainName: "",
    domainPrefix: "",
    http: {
      method: "",
      path: "",
      protocol: "",
      sourceIp: "",
      userAgent: "",
    },
    requestId: "",
    routeKey: "",
    stage: "",
    time: "",
    timeEpoch: 0,
  },
};
