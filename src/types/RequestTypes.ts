export type DashFileEntry = {
  _attributes: {
    height: number;
    maxHeight: number;
  };
  BaseURL: {
    _text: string;
  };
};

export type PackagedMedia = {
  playbackMp4s: {
    duration: number;
    permutations: PackagedMediaPermutation[];
  };
};

export type PackagedMediaPermutation = {
  source: {
    url: string;
  };
};
