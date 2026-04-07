import '@testing-library/jest-dom';

// jsdom does not implement DataTransfer / FileList — provide a minimal polyfill
// so tests that call makeFileList() work without a real browser.
if (typeof DataTransfer === 'undefined') {
  class DataTransferFileList {
    private _files: File[];
    constructor(files: File[]) {
      this._files = files;
      files.forEach((f, i) => { (this as unknown as Record<number, File>)[i] = f; });
    }
    get length() { return this._files.length; }
    item(i: number) { return this._files[i] ?? null; }
    [Symbol.iterator]() { return this._files[Symbol.iterator](); }
  }

  class DataTransferItems {
    private _files: File[];
    constructor(files: File[]) { this._files = files; }
    add(file: File) { this._files.push(file); }
    get length() { return this._files.length; }
  }

  class DataTransferPolyfill {
    private _fileList: File[] = [];
    readonly items: DataTransferItems;

    constructor() {
      this.items = new DataTransferItems(this._fileList);
    }

    get files(): FileList {
      return new DataTransferFileList(this._fileList) as unknown as FileList;
    }
  }

  (globalThis as unknown as Record<string, unknown>).DataTransfer = DataTransferPolyfill;
}
