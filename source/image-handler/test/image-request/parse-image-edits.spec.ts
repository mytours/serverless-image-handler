// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { defaultEvent } from "../mock";

import S3 from "aws-sdk/clients/s3";
import SecretsManager from "aws-sdk/clients/secretsmanager";

import { ImageRequest } from "../../image-request";
import { RequestTypes, StatusCodes } from "../../lib";
import { SecretProvider } from "../../secret-provider";

describe("parseImageEdits", () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("Should pass if the proper result is returned for a sample base64-encoded image request", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/eyJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIiwicm90YXRlIjo5MCwiZmxpcCI6InRydWUifX0=",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageEdits(event, RequestTypes.DEFAULT);

    // Assert
    const expectedResult = { grayscale: "true", rotate: 90, flip: "true" };
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for a sample thumbor-type image request", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageEdits(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = { rotate: 90, grayscale: true };
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the proper result is returned for a sample custom-type image request", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg",
    };

    process.env = {
      REWRITE_MATCH_PATTERN: "/(filters-)/gm",
      REWRITE_SUBSTITUTION: "filters:",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageEdits(event, RequestTypes.CUSTOM);

    // Assert
    const expectedResult = { rotate: 90, grayscale: true };
    expect(result).toEqual(expectedResult);
  });

  it("Should throw an error if a requestType is not specified and/or the image edits cannot be parsed", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/other-image.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);

    // Assert
    try {
      imageRequest.parseImageEdits(event, undefined);
    } catch (error) {
      expect(error).toMatchObject({
        status: StatusCodes.BAD_REQUEST,
        code: "ImageEdits::CannotParseEdits",
        message:
          "The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.",
      });
    }
  });

  describe("IIIF requests", () => {
    it("Should pass if the proper result is returned for a sample IIIF-type image request", () => {
      // Arrange
      const event = {
        ...defaultEvent,
        rawPath:
          "/iiif/2/test-storage%2F42042%2Fe%2F0%2Fbd97fb-490b-43ca-8087-0dcde6aa3a16%2Foriginal.tiff/full/!880,1024/0/default.jpg",
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageEdits(event, RequestTypes.IIIF);

      // Assert
      const expectedResult = {
        toFormat: "jpeg",
        resize: {
          width: 880,
          height: 1024,
        },
      };
      expect(result).toEqual(expectedResult);
    });
  });
});
