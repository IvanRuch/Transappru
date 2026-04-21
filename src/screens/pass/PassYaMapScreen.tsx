import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView, Platform, PermissionsAndroid, StatusBar } from 'react-native';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from '../../styles/Styles.js';
import Api from "../../utils/Api";
import { ScreenHeader } from '../../components/common';

import YaMap, { Marker, Animation, Polygon, YamapInstance } from 'react-native-yamap-plus';

import { mkadPolygonNative, ttkPolygonNative, skPolygonNative } from '../../data/moscowZonePolygons';
YamapInstance.init('9247644d-4157-4d20-bd95-eb97583fc962');

const mkad_polygon_coordinates = mkadPolygonNative;
const ttk_polygon_coordinates = ttkPolygonNative;
const sk_polygon_coordinates = skPolygonNative;

interface PassYaMapProps {
  route: {
    params: {
      auto_list: any[];
      location_type: string;
      lon?: number | string;
      lat?: number | string;
      address?: string;
    };
  };
  navigation: any;
}

interface PassYaMapState {
  location_type: string;
  lon: number | string;
  lat: number | string;
  wrong_location: boolean;
  address_map_data: { address: string };
  mkad_polygon: any[];
  mkad_polygon_inner_ring: any[][];
  ttk_polygon: any[];
  ttk_polygon_inner_ring: any[][];
  sk_polygon: any[];
  isLoadingAddress: boolean;
  /**
   * True when the user has tapped a new point on the map during this visit.
   * In edit mode (opened with an existing address), this flag distinguishes
   * "commit a new selection" from "just go back without changes".
   */
  hasNewPick: boolean;
}

class PassYaMap extends React.Component<PassYaMapProps, PassYaMapState> {
  map: React.RefObject<any>;

  constructor(props: PassYaMapProps) {
    super(props);

    this.map = React.createRef();

    this.state = {
      location_type: props.route.params.location_type || '',
      lon: props.route.params.lon || '',
      lat: props.route.params.lat || '',
      wrong_location: false,
      address_map_data: { address: props.route.params.address || '' },
      mkad_polygon: mkad_polygon_coordinates,
      mkad_polygon_inner_ring: [ ttk_polygon_coordinates ],
      ttk_polygon: ttk_polygon_coordinates,
      ttk_polygon_inner_ring: [ sk_polygon_coordinates ],
      sk_polygon: sk_polygon_coordinates,
      isLoadingAddress: false,
      hasNewPick: false,
    };
  }

  /**
   * True when we are re-visiting an address that's already selected on
   * PassScreen. In this mode: all zones are shown, API call is unfiltered,
   * and the "Добавить" tap without a new pick is a no-op (just goes back).
   */
  get isEditMode(): boolean {
    return !!this.props.route.params.address;
  }

  yaMapLongPress = (point: any) => {
    // In edit mode the zone filter is lifted — user may pick in any zone.
    const apiLocationType = this.isEditMode ? '' : this.state.location_type;

    this.setState({
      lon: point.lon,
      lat: point.lat,
      wrong_location: false,
      isLoadingAddress: true,
      hasNewPick: true,
    })

    Api.post('/get-address-map', { lon: point.lon, lat: point.lat, location_type: apiLocationType })
       .then(res => {
          const data = res.data;
          if(data.auth_required === 1)
          {
            this.setState({ isLoadingAddress: false });
            this.props.navigation.navigate('Auth')
          }
          else
          {
            if(typeof(data.address_map_data.address) !== 'undefined')
            {
              this.setState({address_map_data: data.address_map_data, isLoadingAddress: false})
            }
            else
            {
              // "Out of zone" warning only when a zone filter was actually applied.
              const showWrongLocation = apiLocationType !== '';
              this.setState({address_map_data: { address: '' }, wrong_location: showWrongLocation, isLoadingAddress: false})
            }
          }
        })
        .catch(error => {
          this.setState({ isLoadingAddress: false });
          if(error.response?.status === 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /** Commits the current selection back to PassScreen. The button is hidden
   *  in edit mode until the user taps a new point, so a stale-data commit is
   *  not reachable from the UI. */
  handleAdd = () => {
    this.props.navigation.navigate('Pass', {
      address_map_data: { ...this.state.address_map_data, lon: this.state.lon, lat: this.state.lat },
      auto_list: this.props.route.params.auto_list,
    });
  }

  setMarkerPos = () => {
    return { 
      lon: typeof this.state.lon === 'string' ? parseFloat(this.state.lon) : this.state.lon, 
      lat: typeof this.state.lat === 'string' ? parseFloat(this.state.lat) : this.state.lat 
    }
  }

  async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Разрешение на доступ к местоположению',
            message: 'Приложению требуется доступ к вашему местоположению для работы с картой',
            buttonNeutral: 'Спросить позже',
            buttonNegative: 'Отмена',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Location permission granted');
        } else {
          console.log('⚠️ Location permission denied');
        }
      } catch (err) {
        console.warn('Error requesting location permission:', err);
      }
    }
  }

  componentDidMount() {
    console.log('[PassYaMap] componentDidMount, location_type=', this.state.location_type);
    // Запрашиваем разрешение на геолокацию для Android
    this.requestLocationPermission();

    // Подписываемся на событие focus для обновления координат при возврате на экран
    this.props.navigation.addListener('focus', () => {
      const params = this.props.route.params;
      console.log('PassYaMap focus event - updating coordinates:', params.lon, params.lat, 'location_type:', params.location_type);
      this.setState({
        lon: params.lon || '',
        lat: params.lat || '',
        location_type: params.location_type || '',
        address_map_data: { address: params.address || '' }
      });
    });
  }

  componentWillUnmount() {
      console.log('[PassYaMap] componentWillUnmount');
  }

  render() {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar 
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
        
        {/* Заголовок с кнопкой назад */}
        <ScreenHeader 
          title="Добавить адрес"
          onBack={() => {
            console.log('-> move to Pass (without saving address)')
            this.props.navigation.goBack()
          }}
        />

        <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 15, paddingBottom: 15, fontSize: 15, fontWeight: "bold", color: "#313131" }}>Укажите адрес долгим нажатием на карте</Text>

        {/* Индикатор загрузки адреса */}
        {
          this.state.isLoadingAddress ? (
            <View style={{ 
              position: 'absolute', 
              zIndex: 3, elevation: 3, 
              top: 160, 
              left: 0,
              right: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{
                flexDirection: "row",
                alignItems: 'center',
                margin: 20, 
                padding: 15, 
                backgroundColor: "#FFFFFF", 
                borderRadius: 8,
                borderWidth: 1, 
                borderColor: "#B8B8B8",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}>
                <ActivityIndicator size="small" color="#313131" />
                <Text style={{ marginLeft: 10, fontSize: 15, color: "#313131" }}>Определение адреса...</Text>
              </View>
            </View>
          ) : null
        }

        {
          this.state.address_map_data.address !== '' ? (
            <View style={{ 
              position: 'absolute', 
              zIndex: 3, elevation: 3, 
              top: 160, 
              flexDirection: "row", 
              margin: 20, 
              padding: 10, 
              backgroundColor: "#FFFFFF", 
              borderRadius: 8,
              borderWidth: 1, 
              borderColor: "#B8B8B8",
            }}>
              <View style={{
                flex: 5,
                flexDirection: "column",
                paddingLeft: 10,
              }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: "#313131"}}>{this.state.address_map_data.address}</Text>
              </View>
            </View>
          ) : null
        }

        {
          this.state.wrong_location ? (
            <View style={{ 
              position: 'absolute', 
              zIndex: 3, 
              elevation: 3, 
              top: 160, 
              flexDirection: "row", 
              margin: 20, 
              padding: 10, 
              backgroundColor: "#FFFFFF", 
              borderRadius: 8,
              borderWidth: 1, 
              borderColor: "#B8B8B8",
            }}>
              <View style={{
                flex: 5,
                flexDirection: "column",
                paddingLeft: 10,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: "#fee600", alignItems: 'center'}}>Адрес находится вне выбранной зоны</Text>
              </View>
            </View>
          ) : null
        }

        <YaMap
          ref={this.map}
          rotateGesturesDisabled={true}
          showUserPosition={false}
          userLocationAccuracyFillColor="rgba(0, 0, 0, 0)"
          userLocationAccuracyStrokeColor="rgba(0, 0, 0, 0)"
          userLocationAccuracyStrokeWidth={0}
          initialRegion={{
              lat: 55.74954,
              lon: 37.621587,
              // In edit mode we show all 3 zones, so use the default (zoomed-out) level.
              zoom: this.isEditMode ? 10 :
                    this.state.location_type === 'sk' ? 12.4 :
                    this.state.location_type === 'ttk' ? 11.4 : 10
          }}
          onMapLongPress={(point) => this.yaMapLongPress(point.nativeEvent)}
          style={{ flex: 1 }}
        >
            <Marker
              point={{ lon: 37.621587, lat: 55.74954 }}
              source={require('../../../assets/images/moscow_marker.png')}
            />
            {
              this.state.lon !== '' && this.state.lat !== '' ? (
                <Marker
                  point={this.setMarkerPos()}
                  source={require('../../../assets/images/address_marker.png')}
                />
              ) : null
            }

            {
              // In edit mode — or when no zone was pre-selected — show all three zones.
              // Otherwise show only the pre-selected zone to emphasise the filter.
              (this.isEditMode || this.state.location_type === '') ? (
                <>
                  <Polygon
                    strokeColor="#FF0000"
                    fillColor="rgba(0, 0, 255, 0.15)"
                    points={this.state.mkad_polygon}
                  />
                  <Polygon
                    strokeColor="#FF0000"
                    fillColor="rgba(0, 255, 0, 0.15)"
                    points={this.state.ttk_polygon}
                  />
                  <Polygon
                    strokeColor="#FF0000"
                    fillColor="rgba(255, 0, 0, 0.15)"
                    points={this.state.sk_polygon}
                  />
                </>
              ) : this.state.location_type === 'mkad' ? (
                <Polygon
                  strokeColor="#FF0000"
                  fillColor="rgba(0, 0, 255, 0.15)"
                  points={this.state.mkad_polygon}
                  innerRings={this.state.mkad_polygon_inner_ring}
                />
              ) : this.state.location_type === 'ttk' ? (
                <Polygon
                  strokeColor="#FF0000"
                  fillColor="rgba(0, 255, 0, 0.15)"
                  points={this.state.ttk_polygon}
                  innerRings={this.state.ttk_polygon_inner_ring}
                />
              ) : this.state.location_type === 'sk' ? (
                <Polygon
                  strokeColor="#FF0000"
                  fillColor="rgba(255, 0, 0, 0.15)"
                  points={this.state.sk_polygon}
                />
              ) : null
            }

        </YaMap>

        <SafeAreaInsetsContext.Consumer>
          {(insets) => {
            // Add button is shown when there's an address to commit.
            // In edit mode it's additionally gated on hasNewPick — nothing to
            // commit when the user didn't make a new pick (they can just go back).
            const canAdd = this.state.address_map_data.address !== ''
              && (!this.isEditMode || this.state.hasNewPick);
            if (!canAdd) return null;

            return (
              <TouchableHighlight
                style={{
                  position: 'absolute',
                  zIndex: 3,
                  elevation: 3,
                  left: 10,
                  bottom: Math.max(insets?.bottom || 0, 20),
                  right: 10,
                  height: 50,
                  margin: 25,
                  borderRadius: 5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#3A3A3A',
                }}
                underlayColor="#555555"
                onPress={this.handleAdd}
              >
                <Text style={{ fontSize: 24, color: '#FFFFFF' }}>Добавить</Text>
              </TouchableHighlight>
            );
          }}
        </SafeAreaInsetsContext.Consumer>

      </SafeAreaView>
    );
  }

}

export default PassYaMap;
