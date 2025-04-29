import { expect } from "chai";
import sinon from "sinon";
import { downloadFile } from "@/libs/fileHandler";
import axios, { AxiosError } from "axios";
import * as logger from "@/libs/logger";

describe("downloadFile (unit)", () => {
  let axiosStub: sinon.SinonStub;
  let logStub: sinon.SinonStub;

  const url = "https://example.com/file.mp4";
  const savePath = "./downloads/file.mp4";

  beforeEach(() => {
    // Stub axios instead of fetchFile
    axiosStub = sinon.replace(axios, "get", sinon.stub());
    logStub = sinon.stub(logger, "default").resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should retry on ECONNREFUSED AxiosError", async () => {
    // Arrange: simulate ECONNREFUSED first, success after
    const connRefusedError = new AxiosError("connect ECONNREFUSED");
    axiosStub.onFirstCall().rejects(connRefusedError);
    axiosStub.onSecondCall().resolves({
      data: {
        pipe: (dest: any) => dest.end(), // Simulate stream ending immediately
      },
    });

    // Stub setTimeout to call immediately
    const timeoutStub = sinon.stub(global, "setTimeout").callsFake((fn: any) => {
      fn();
      return 0 as any;
    });

    // Act
    const result = await downloadFile(url, savePath);

    // Assert
    expect(axiosStub.callCount).to.be.greaterThanOrEqual(2);
    expect(logStub.calledWithMatch({ message: sinon.match(/ECONNREFUSED/) })).to.be.true;
    expect(result).to.equal(savePath);

    timeoutStub.restore();
  });

  it("should reject on unknown error", async () => {
    // Arrange
    const otherError = new Error("Some random failure");
    axiosStub.rejects(otherError);

    // Act & Assert
    try {
      await downloadFile(url, savePath);
      throw new Error("Expected to throw");
    } catch (e) {
      expect(e).to.equal(otherError);
    }
  });
});
