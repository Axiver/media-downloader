import { expect } from "chai";
import sinon from "sinon";
import { AxiosError } from "axios";
import handleGifyModule, { gfy_archive_base_url } from "@/libs/handleGify";
import * as fileHandler from "@/libs/fileHandler";
import * as logger from "@/libs/logger";

const handleGify: typeof handleGifyModule = handleGifyModule as any;

describe("handleGify (unit)", () => {
  // Global stubs
  let downloadStub: sinon.SinonStub;
  let logStub: sinon.SinonStub;

  // Mock data
  const identifier = "SomeIdentifier-example";
  const url = `https://gfycat.com/${identifier}`;
  const savePath = "/downloads";
  const expectedConvertedUrl = gfy_archive_base_url.replace("{identifier}", "SomeIdentifier"); // Only the first part of the identifier is used

  beforeEach(() => {
    // Stub the download and logging
    downloadStub = sinon.stub(fileHandler, "downloadFile").resolves();
    logStub = sinon.stub(logger, "default").returns(new Promise<void>((resolve) => resolve()));
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });

  it("should convert the URL and call downloadFile with correct args", async () => {
    const result = await handleGify(url, savePath);
    expect(downloadStub.calledOnce).to.be.true;
    expect(downloadStub.firstCall.args[0]).to.equal(expectedConvertedUrl);
    expect(result).to.include(savePath); // handleGify should return the full path
  });

  it("should use the provided fileName when given", async () => {
    const result = await handleGify(url, savePath, "customName");
    expect(result).to.equal(`${savePath}/customName.mp4`);
  });

  it("should derive a fileName from the identifier supplied if no file name is given", async () => {
    const result = await handleGify(url, savePath);
    expect(result).to.equal(`${savePath}/${identifier}.mp4`);
  });

  it("should retry on ECONNREFUSED AxiosError", async () => {
    // Setup scenario to simulate ECONNREFUSED error
    const error = new AxiosError("connect ECONNREFUSED");
    downloadStub.onFirstCall().rejects(error);
    downloadStub.onSecondCall().resolves();

    // Skip the timeout to simulate immediate retry
    const timeoutStub = sinon.stub(global, "setTimeout").callsFake((fn: any) => {
      fn();
      return 0 as any;
    });

    const result = await handleGify(url, savePath);

    expect(logStub.calledWithMatch({ message: sinon.match(/ECONNREFUSED/) })).to.be.true;
    expect(downloadStub.callCount).to.be.greaterThanOrEqual(2);
    expect(result).to.include(".mp4");

    timeoutStub.restore();
  });

  it("should reject on unknown error", async () => {
    const err = new Error("Something went wrong");
    downloadStub.rejects(err);

    try {
      await handleGify(url, savePath);
      throw new Error("Expected to throw");
    } catch (e) {
      expect(e).to.equal(err);
    }
  });
});
