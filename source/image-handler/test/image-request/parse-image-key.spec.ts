// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { defaultEvent } from "../mock";

import S3 from "aws-sdk/clients/s3";
import SecretsManager from "aws-sdk/clients/secretsmanager";

import { ImageRequest } from "../../image-request";
import { RequestTypes, StatusCodes } from "../../lib";
import { SecretProvider } from "../../secret-provider";

describe("parseImageKey", () => {
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

  it("Should pass if an image key value is provided in the default request format", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5Ijoic2FtcGxlLWltYWdlLTAwMS5qcGcifQ==",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.DEFAULT);

    // Assert
    const expectedResult = "sample-image-001.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("should read image requests with base64 encoding having slash", () => {
    const event = {
      ...defaultEvent,
      rawPath:
        "/eyJidWNrZXQiOiJlbGFzdGljYmVhbnN0YWxrLXVzLWVhc3QtMi0wNjY3ODQ4ODU1MTgiLCJrZXkiOiJlbnYtcHJvZC9nY2MvbGFuZGluZ3BhZ2UvMV81N19TbGltTl9MaWZ0LUNvcnNldC1Gb3ItTWVuLVNOQVAvYXR0YWNobWVudHMvZmZjMWYxNjAtYmQzOC00MWU4LThiYWQtZTNhMTljYzYxZGQzX1/Ys9mE2YrZhSDZhNmK2YHYqiAoMikuanBnIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo0ODAsImZpdCI6ImNvdmVyIn19fQ==",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.DEFAULT);

    // Assert
    const expectedResult =
      "env-prod/gcc/landingpage/1_57_SlimN_Lift-Corset-For-Men-SNAP/attachments/ffc1f160-bd38-41e8-8bad-e3a19cc61dd3__سليم ليفت (2).jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request format", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request format having open, close parentheses", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/thumbor-image (1).jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image (1).jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should not include s3:bucket tag if a thumbor request includes an s3:bucket tag that is equal to the overridden bucket", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/s3:some-test-bucket/filters:grayscale()/thumbor-image (1).jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR, "some-test-bucket");

    // Assert
    const expectedResult = "thumbor-image (1).jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should include s3:bucket tag if a thumbor request includes an s3:bucket tag that is not equal to the overridden bucket", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/s3:some-test-bucket/thumbor-image (1).jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR, "some-other-bucket");

    // Assert
    const expectedResult = "s3:some-test-bucket/thumbor-image (1).jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request format having open parentheses", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/thumbor-image (1.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image (1.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request format having close parentheses", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/thumbor-image 1).jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image 1).jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request format having close parentheses in the middle of the name", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image (1) suffix.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request and the path has crop filter", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/10x10:100x100/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image (1) suffix.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request and the path has resize filter", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/10x10/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image (1) suffix.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request and the path has crop and resize filters", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/10x20:100x200/10x10/filters:rotate(90)/filters:grayscale()/thumbor-image (1) suffix.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "thumbor-image (1) suffix.jpg";
    expect(result).toEqual(expectedResult);
  });

  it('Should pass if an image key value is provided in the thumbor request and the key string has substring "fit-in"', () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/fit-in/400x0/filters:fill(ffffff)/fit-in-thumbor-image (1) suffix.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "fit-in-thumbor-image (1) suffix.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the image in the sub-directory", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/100x100/test-100x100/test/beach-100x100.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "test-100x100/test/beach-100x100.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the custom request format", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters-rotate(90)/filters-grayscale()/custom-image.jpg",
    };

    process.env = {
      REWRITE_MATCH_PATTERN: "/(filters-)/gm",
      REWRITE_SUBSTITUTION: "filters:",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.CUSTOM);

    // Assert
    const expectedResult = "custom-image.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the custom request format", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters-rotate(90)/filters-grayscale()/custom-image.jpg",
    };

    process.env = {
      REWRITE_MATCH_PATTERN: "/(filters-)/gm",
      REWRITE_SUBSTITUTION: "filters:",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.CUSTOM);

    // Assert
    const expectedResult = "custom-image.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should throw an error if an unrecognized requestType is passed into the function as a parameter", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/filters:rotate(90)/filters:grayscale()/other-image.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);

    // Assert
    try {
      imageRequest.parseImageKey(event, undefined);
    } catch (error) {
      expect(error).toMatchObject({
        status: StatusCodes.NOT_FOUND,
        code: "ImageEdits::CannotFindImage",
        message:
          "The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists.",
      });
    }
  });

  it("Should pass if an image key value is provided in the thumbor request format with a watermark containing a slash", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/fit-in/400x400/filters:watermark(bucket,folder/key.png,0,0)/image.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "image.jpg";
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if an image key value is provided in the thumbor request format with a watermark not containing a slash", () => {
    // Arrange
    const event = {
      ...defaultEvent,
      rawPath: "/fit-in/400x400/filters:watermark(bucket,key.png,0,0)/image.jpg",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseImageKey(event, RequestTypes.THUMBOR);

    // Assert
    const expectedResult = "image.jpg";
    expect(result).toEqual(expectedResult);
  });

  describe("IIIF requests", () => {
    it("Should pass if an image key value is provided in the iiif request format", () => {
      // Arrange
      const event = {
        ...defaultEvent,
        rawPath:
          "/iiif/2/test-storage%2F42042%2Fe%2F0%2Fbd97fb-490b-43ca-8087-0dcde6aa3a16%2Foriginal.tiff/full/!880,1024/0/default.jpg",
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const result = imageRequest.parseImageKey(event, RequestTypes.IIIF);

      // Assert
      const expectedResult = "42042/e/0/bd97fb-490b-43ca-8087-0dcde6aa3a16/original.tiff";
      expect(result).toEqual(expectedResult);
    });
  });
});
