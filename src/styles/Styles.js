import { Platform, StyleSheet } from 'react-native';

export default StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },

  auto: {
    width: 52,
    height: 32,
    marginBottom: 10,
  },

  header: {
    paddingLeft: 20,
    fontSize: 28,
    fontWeight: "bold",
    color: "#E8E8E8",
    ...Platform.select({
      ios: {
        paddingTop: 50,
      },
      android: {
        paddingTop: 20,
      },
      default: {
        paddingTop: 20,
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
     right: 20,
     padding: 10,
     ...Platform.select({
       ios: {
         top: 50,
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
    width: 157,
    height: 90,
    backgroundColor: "#4C4C4C",
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
    width: 157,
    height: 90,
    backgroundColor: "#2C2C2C",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  }

});
