import { ImageEdits, ImageFormatTypes } from "../lib";
import { IIIFMapper } from "../iiif-mapper";

describe("process()", () => {
  it("Should pass if the proper edit translations are applied and in the correct order", () => {
    // Arrange
    const path =
      "/iiif/2/test-storage%2F42042%2Fe%2F0%2Fbd97fb-490b-43ca-8087-0dcde6aa3a16%2Foriginal.tiff/full/!880,1024/0/default.jpg";

    // Act
    const iiifMapper = new IIIFMapper();
    const edits = iiifMapper.mapPathToEdits(path);

    // Assert
    const expectedResult = {
      edits: {
        resize: {
          fit: "inside",
          width: 880,
          height: 1024,
          withoutEnlargement: true,
        },
        toFormat: "jpeg",
      },
    };
    expect(edits).toEqual(expectedResult.edits);
  });
});
