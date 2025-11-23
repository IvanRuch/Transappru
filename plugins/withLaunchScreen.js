/* eslint-env node */
const { withInfoPlist, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Модифицирует SplashScreen.storyboard добавляя текст "TransApp"
 * Более безопасный подход - работаем с существующим файлом от expo-splash-screen
 */
const withLaunchScreen = (config) => {
  // Модифицируем SplashScreen.storyboard напрямую
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName || 'TransApp';
      const splashScreenPath = path.join(iosPath, projectName, 'SplashScreen.storyboard');

      // SplashScreen.storyboard с текстом "TransApp" по центру
      const launchScreenContent = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21507" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21505"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <!--View Controller-->
        <scene sceneID="EHf-IW-A2E">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <label opaque="NO" clipsSubviews="YES" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" text="TransApp" textAlignment="center" lineBreakMode="middleTruncation" baselineAdjustment="alignBaselines" minimumFontSize="18" translatesAutoresizingMaskIntoConstraints="NO" id="GJd-Yh-RWb">
                                <rect key="frame" x="0.0" y="404.66666666666669" width="393" height="43"/>
                                <fontDescription key="fontDescription" type="boldSystem" pointSize="36"/>
                                <nil key="highlightedColor"/>
                            </label>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
                        <color key="backgroundColor" red="1" green="1" blue="1" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                        <constraints>
                            <constraint firstItem="GJd-Yh-RWb" firstAttribute="centerY" secondItem="Ze5-6b-2t3" secondAttribute="centerY" id="exm-UA-ej4"/>
                            <constraint firstItem="GJd-Yh-RWb" firstAttribute="leading" secondItem="Bcu-3y-fUS" secondAttribute="leading" id="3sD-i9-k74"/>
                            <constraint firstItem="Bcu-3y-fUS" firstAttribute="trailing" secondItem="GJd-Yh-RWb" secondAttribute="trailing" id="VQL-TW-ZKS"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="52.671755725190835" y="374.64788732394368"/>
        </scene>
    </scenes>
</document>`;

      // Перезаписываем SplashScreen.storyboard с текстом "TransApp"
      if (fs.existsSync(splashScreenPath)) {
        fs.writeFileSync(splashScreenPath, launchScreenContent, 'utf-8');
        console.log('✅ SplashScreen.storyboard модифицирован с текстом "TransApp"');
      } else {
        console.log('⚠️  SplashScreen.storyboard не найден, пропускаем');
      }

      return config;
    }
  ]);

  return config;
};

module.exports = withLaunchScreen;
