declare global {
  var showInAppNotification: ((title: string, body: string) => void) | undefined;
}

export {};
