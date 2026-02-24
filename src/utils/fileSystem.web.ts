// Web stub for react-native-fs
// Uses browser download via <a> element

const RNFS = {
  DocumentDirectoryPath: '/documents',
  ExternalDirectoryPath: '/external',
  DownloadDirectoryPath: '/downloads',
  ExternalStorageDirectoryPath: '/storage',

  downloadFile({ fromUrl, toFile }: { fromUrl: string; toFile: string }) {
    const fileName = toFile.split('/').pop() || 'download';

    const promise = fetch(fromUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { statusCode: 200, bytesWritten: blob.size };
      });

    return { promise };
  },

  writeFile(_path: string, _content: string, _encoding?: string) {
    return Promise.resolve();
  },

  readDir(_path: string) {
    return Promise.resolve([]);
  },
};

export default RNFS;
