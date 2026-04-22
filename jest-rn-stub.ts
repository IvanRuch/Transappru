/**
 * Minimal react-native stub for unit tests — exports the primitives we
 * actually touch in hooks and utilities. For full component rendering,
 * use jest-expo preset once it's SDK 54-compatible.
 */
import React from 'react';

const passthrough = (type: string) =>
  React.forwardRef<any, any>(({ children, ...props }, ref) =>
    React.createElement(type, { ...props, ref }, children));

export const View = passthrough('view');
export const Text = passthrough('span');
export const Pressable = passthrough('button');
export const TouchableOpacity = passthrough('button');
export const TouchableHighlight = passthrough('button');
export const Image = passthrough('img');
export const ScrollView = passthrough('div');
export const FlatList = passthrough('div');
export const TextInput = passthrough('input');
export const Modal = passthrough('dialog');
export const Switch = passthrough('input');
export const ActivityIndicator = passthrough('progress');
export const StatusBar = passthrough('div');
export const SafeAreaView = passthrough('div');
export const KeyboardAvoidingView = passthrough('div');

export const Alert = {
  alert: jest.fn(),
};
export const Linking = {
  openURL: jest.fn(),
};
export const Platform = {
  OS: 'ios',
  select: (obj: Record<string, any>) => obj.ios ?? obj.default,
};
export const StyleSheet = {
  create: (styles: Record<string, any>) => styles,
  flatten: (style: any) => style,
  hairlineWidth: 1,
};
export const PermissionsAndroid = {
  request: jest.fn(async () => 'granted'),
  PERMISSIONS: { ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION' },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
};
export const Keyboard = {
  dismiss: jest.fn(),
};
export const useWindowDimensions = () => ({ width: 1024, height: 768 });
export const findNodeHandle = () => null;

export default {
  View, Text, Pressable, TouchableOpacity, TouchableHighlight, Image,
  ScrollView, FlatList, TextInput, Modal, Switch, ActivityIndicator,
  StatusBar, SafeAreaView, Alert, Linking, Platform, StyleSheet,
  PermissionsAndroid, Keyboard, useWindowDimensions, findNodeHandle,
};
