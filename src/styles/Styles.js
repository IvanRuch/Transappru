import { Platform, StyleSheet } from 'react-native';

export default StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },

  auto: {
    width: 52,
    height: 32,
    marginBottom: 10,
  },

  header: {
    textAlign: 'center',
    paddingLeft: 20,
    fontSize: 24,
    fontWeight: "bold",
    color: "#313131",
    ...Platform.select({
      ios: {
        paddingTop: 70,
      },
      android: {
        paddingTop: 25,
      },
      default: {
        paddingTop: 25,
      }
    })
  },

  sub_header: {
    paddingLeft: 20,
    fontSize: 15,
    color: "#8C8C8C"
  },

  header_back: {
     position: 'absolute',
     top: 20,
     left: 20,
     padding: 10,
     ...Platform.select({
       ios: {
         top: 65,
       },
       android: {
         top: 20,
       },
       default: {
         top: 20,
       }
    })
  },

  header_onboarding: {
      position: 'absolute',
      top: 20,
      left: 60,
      padding: 10,
      ...Platform.select({
        ios: {
          top: 65,
        },
        android: {
          top: 20,
        },
        default: {
          top: 20,
        }
    })
  },

  header_filter: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    ...Platform.select({
      ios: {
        top: 65,
      },
      android: {
        top: 20,
      },
      default: {
        top: 20,
      }
   })
 },

  tab_checked: {
    alignItems: 'center',
    padding: 10,
    margin: 8,
    width: 147,
    height: 80,
    backgroundColor: "#D7D7D7",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },

  tab: {
    alignItems: 'center',
    padding: 10,
    margin: 8,
    width: 147,
    height: 80,
    backgroundColor: "#EEEEEE",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },

  green: {
    color: '#40882C',
  },

  red: {
    color: '#EE505A'
  },

  yellow: {
    color: '#FFA500'
  },

  white: {
    color: '#3A3A3A'
  }

});
