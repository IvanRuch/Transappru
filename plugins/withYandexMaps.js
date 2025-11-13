const { 
  withAppDelegate, 
  withPodfile,
  withGradleProperties 
} = require("expo/config-plugins");

const withYandexMaps = (config) => {
  // iOS: Add YMKMapKit initialization to AppDelegate
  config = withAppDelegate(config, async (config) => {
    const appDelegate = config.modResults;
    
    // Add import
    if (!appDelegate.contents.includes("#import <YandexMapsMobile/YMKMapKitFactory.h>")) {
      appDelegate.contents = appDelegate.contents.replace(
        /#import "AppDelegate.h"/g,
        `#import "AppDelegate.h"\n#import <YandexMapsMobile/YMKMapKitFactory.h>`
      );
    }

    const mapKitMethodInvocations = [
      `[YMKMapKit setApiKey:@"9247644d-4157-4d20-bd95-eb97583fc962"];`,
      `[YMKMapKit setLocale:@"ru_RU"];`,
      `[YMKMapKit mapKit];`,
    ]
      .map((line) => `  ${line}`)
      .join("\n");

    // Add invocation
    if (!appDelegate.contents.includes("[YMKMapKit mapKit];")) {
      appDelegate.contents = appDelegate.contents.replace(
        /\s+return YES;/g,
        `\n\n${mapKitMethodInvocations}\n\n  return YES;`
      );
    }

    return config;
  });

  // iOS: Enable Lite version in Podfile
  config = withPodfile(config, async (config) => {
    const podfile = config.modResults;
    
    // Add USE_YANDEX_MAPS_LITE environment variable at the top
    if (!podfile.contents.includes("ENV['USE_YANDEX_MAPS_LITE']")) {
      podfile.contents = `ENV['USE_YANDEX_MAPS_LITE'] = "1"\n\n${podfile.contents}`;
    }

    return config;
  });

  // Android: Enable Lite version in gradle.properties
  config = withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'useYandexMapsLite',
      value: 'true',
    });
    return config;
  });

  return config;
};

module.exports = withYandexMaps;
