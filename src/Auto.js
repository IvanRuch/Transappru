import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import DocumentPicker from "react-native-document-picker";
import axios from "axios";
import RNFS from 'react-native-fs';
//import RNFetchBlob from 'rn-fetch-blob'

import Api from "./utils/Api";

class Auto extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      auto_data: props.route.params.auto_data,
      current_tab: 'files',

      files_indicator: false,
      auto_file_data: [],
      auto_file_item: { id: '', description: '', file_data: [] },
      file_data_item: { id: '', file: '' },
      modalEditFileVisible: false,
      modalEditFileMode: '',
      modalDelFileVisible: false,

      fines_indicator: true,
      auto_fine_data: { paid_list: [], unpaid_list: [] },
      auto_fine_paid_list_hide: false,
      auto_fine_unpaid_list_hide: true,

      osago_indicator: true,
      auto_osago_data: {},

      diagnostic_card_indicator: true,
      auto_diagnostic_card_data: {},

      passes_indicator: true,
      auto_passes_data: [],
    };
  }

  checkTab = (tab) => {
    console.log('checkTab. tab = ' + tab)

    this.setState({current_tab: tab})

    if(tab == 'files')
    {
      this.scrollView.scrollTo({x: 0});
      AsyncStorage.getItem('token').then((value) => this.getAutoFiles(value));
    }
    else if(tab == 'fines')
    {
      this.scrollView.scrollTo({x: 170});
      AsyncStorage.getItem('token').then((value) => this.getAutoFines(value));
    }
    else if(tab == 'osago')
    {
      this.scrollView.scrollTo({x: 340});
      AsyncStorage.getItem('token').then((value) => this.getAutoOsago(value));
    }
    else if(tab == 'diagnostic_card')
    {
      this.scrollView.scrollTo({x: 515});
      AsyncStorage.getItem('token').then((value) => this.getAutoCheckDiagnosticCard(value));
    }
    else if(tab == 'passes')
    {
      this.scrollView.scrollTo({x: 690});
      AsyncStorage.getItem('token').then((value) => this.getAutoPasses(value));
    }
  }

  /* Файлы */
  downloadFile = (item) => {
    console.log('downloadFile')

    console.log('item')
    console.log(item)

    /*
    let dirs = RNFetchBlob.fs.dirs

    console.log('dirs')
    console.log(dirs)

    RNFetchBlob
    .config({
      path : dirs.DocumentDir + '/' + item.filename
    })
    .fetch('GET', item.file_mini)
    .then((res) => {
      // the path should be dirs.DocumentDir + 'path-to-file.anything'
      console.log('The file saved to ', res.path())
    })
    */

    /*
    let dirs = RNFetchBlob.fs.dirs

    console.log('dirs')
    console.log(dirs)

    RNFetchBlob
    .config({
      // response data will be saved to this path if it has access right.
      //path : dirs.DocumentDir + '/' + item.filename
      path : dirs.DownloadDir + '/' + item.filename
    })
    .fetch('GET', item.file_mini)
    .then((res) => {
      // the path should be dirs.DocumentDir + 'path-to-file.anything'
      console.log('The file saved to ', res.path())
    })
    */


    console.log('RNFS.DocumentDirectoryPath = ' + RNFS.DocumentDirectoryPath)
    console.log('RNFS.ExternalDirectoryPath = ' + RNFS.ExternalDirectoryPath)
    console.log('RNFS.DownloadDirectoryPath = ' + RNFS.DownloadDirectoryPath)

    let toFile = `${RNFS.DocumentDirectoryPath}/${item.filename}`;
    console.log('toFile = ' + toFile)

    RNFS.downloadFile({
        fromUrl: item.request_uri,
        toFile: toFile,
    }).promise.then((r) => {
      console.log('promise.then')
      console.log('r')
      console.log(r)
    });

    let path = RNFS.DocumentDirectoryPath + '/test000.txt';

    RNFS.writeFile(path, 'Hello', 'utf8')
      .then((success) => {
        console.log('FILE WRITTEN!');
      })
      .catch((err) => {
        console.log(err.message);
      });

    RNFS.readDir(RNFS.DocumentDirectoryPath)
    .then((result) => {

      for(var i=0; i<result.length; i++)
      {
        console.log('result[' + i + ']');
        console.log(result[i]);
      }



      // stat the first file
      //return Promise.all([RNFS.stat(result[0].path), result[0].path]);
    })


    /*
    RNFS.readDir(RNFS.ExternalDirectoryPath)
    .then((result) => {
      console.log('GOT RESULT', result);

      // stat the first file
      //return Promise.all([RNFS.stat(result[0].path), result[0].path]);
    })
    .then((statResult) => {

    })
    .then((contents) => {
      // log the file contents
      console.log(contents);
    })
    .catch((err) => {
      console.log(err.message, err.code);
    });
    */

    /*
    let toFile = `${RNFS.DocumentDirectoryPath}/${item.filename}`;
    console.log('toFile = ' + toFile)



    RNFS.downloadFile({
        fromUrl: item.request_uri,
        //toFile: `${RNFS.DocumentDirectoryPath}/react-native.png`,
        //toFile: `${RNFS.ExternalDirectoryPath}/react-native.png`,
        //toFile: `${RNFS.DocumentDirectoryPath}/react-native.png`,
        //toFile: RNFS.DocumentDirectoryPath + '/' + item.filename`,
        //toFile: `${RNFS.DocumentDirectoryPath}/${item.filename}`,
        toFile: `${RNFS.ExternalDirectoryPath}/${item.filename}`,
    }).promise.then((r) => {
      //this.setState({ isDone: true })

      console.log('promise.then')
      console.log('r')
      console.log(r)
    });
    */

  }

  /* удаление файла */
  delAutoFile = (value) => {
    console.log('delAutoFile. value = ' + value)

    Api.post('/del-auto-file', { token: value, id: this.state.file_data_item.id, file: this.state.file_data_item.file })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            let file_data_new = []

            for (var i=0; i<this.state.auto_file_item.file_data.length; i++)
            {
              if(this.state.auto_file_item.file_data[i].id != this.state.file_data_item.id)
              {
                file_data_new.push(this.state.auto_file_item.file_data[i])
              }
            }

            console.log('file_data_new')
            console.log(file_data_new)

            let auto_file_item_new = { id: this.state.auto_file_item.id, description: this.state.auto_file_item.description, file_data: file_data_new }
            let auto_file_data_new = []

            for (var i=0; i<this.state.auto_file_data.length; i++)
            {
              if(this.state.auto_file_data[i].id != this.state.auto_file_item.id)
              {
                auto_file_data_new.push(this.state.auto_file_data[i])
              }
              else if(data.empty_file_group == 0)
              {
                auto_file_data_new.push(auto_file_item_new)
              }
            }

            console.log('auto_file_data_new')
            console.log(auto_file_data_new)

            this.setState({ modalDelFileVisible: false,
                            modalEditFileMode: '',
                            modalEditFileVisible: data.empty_file_group == 1 ? false : true,
                            file_data_item: { id: '', file: '' },
                            auto_file_item: data.empty_file_group == 1 ? { id: '', description: '', file_data: [] } : auto_file_item_new,
                            auto_file_data: auto_file_data_new })
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  openModalEditFile = (mode, item) => {
    console.log('openModalEditFile. mode = ' + mode )

    if(mode == 'add')
    {
      this.setState({modalEditFileVisible: true, modalEditFileMode: mode})
    }
    else
    {
      this.setState({modalEditFileVisible: true,
                     modalEditFileMode: mode,
                     auto_file_item: { id: item.id, description: item.description, file_data: item.file_data } })
    }
  }

  closeModalEditFile = () => {
    console.log('closeModalEditFile')
    this.setState({modalEditFileVisible: false, auto_file_item: { id: '', description: '', file_data: [] },})
  }

  getAutoFiles = (value) => {
    console.log('getAutoFiles. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({files_indicator: true})

      Api.post('/get-auto-files', { token: value, id : this.state.auto_data.id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({auto_file_data: data.auto_file_data, files_indicator: false})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });

      this.setState({files_indicator: false})
    }
  }

  changeFileDescription = (value) => {
    console.log('changeFileDescription. value = ' + value)

    let auto_file_item_new = this.state.auto_file_item
        auto_file_item_new.description = value

    this.setState({auto_file_item: auto_file_item_new})
  }

  uploadFile = async (value, pickdata) => {
    console.log('uploadFile, value = ' + value)

    console.log('pickdata')
    console.log(pickdata)

    var formData = new FormData();
    formData.append('token', value);
    formData.append('id', this.state.auto_data.id);
    formData.append('auto_file_group', this.state.auto_file_item.id);
    formData.append('description', this.state.auto_file_item.description);

    for (var i = 0; i < pickdata.length; i++)
    {
      formData.append('file'+i, {
        name: pickdata[i].name,
        uri: pickdata[i].uri,
        type: pickdata[i].type,
      });
    }

    Api.post('/upload-auto-file', formData, { "Accept": "application/json", "Content-Type": "multipart/form-data", })
       .then(res => {

          const data = res.data;
          console.log('data')
          console.log(data);

          let auto_file_data_new = []
          let find = 0;

          for (var i=0; i<this.state.auto_file_data.length; i++)
          {
            if(this.state.auto_file_data[i].id != data.auto_file_item.id)
            {
              auto_file_data_new.push(this.state.auto_file_data[i])
            }
            else
            {
              auto_file_data_new.push(data.auto_file_item)
              find = 1;
            }
          }

          console.log('find = ' + find)
          console.log('data')
          console.log(data);

          if(!find)
          {
            auto_file_data_new.push(data.auto_file_item)
          }

          this.setState({ auto_file_item: data.auto_file_item,
                          auto_file_data: auto_file_data_new })
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  pickFile = async () => {
    console.log('pickFile')

    // Pick a multiple file
    try
    {
      const data = await DocumentPicker.pickMultiple({
         type: [DocumentPicker.types.allFiles],
      });

      AsyncStorage.getItem('token').then((value) => this.uploadFile(value, data));
      //this.uploadFile(data)
    }
    catch (err)
    {
      if (DocumentPicker.isCancel(err))
      {
        console.log("cancel pick file", err);
      }
      else
      {
        throw err;
      }
    }
  }

  renderModalEditAutoFileDataItem = (item) => {

    return (

      <View
        key={item.id}
        style={{ flexDirection: "row", margin: 16, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
        <View style={{
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: "column",
        }}>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              margin: 5,
              backgroundColor: "#F0F0F0",
              borderRadius: 5,
          }}>
            { item.file_mini != '' ? (
                <Image
                  source={{uri: item.file_mini}}
                  resizeMode="cover"
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 5
                }}>
                </Image>
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "normal", color: "#2B2D33" }}>{ item.ext }</Text>
              )
            }
          </View>
        </View>
        <View style={{
          flex: 5,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: "column",
        }}>
          <Text style={{ paddingLeft: 10, paddingRight: 10, fontSize: 14, fontWeight: "bold", color: "#E8E8E8" }}>{ item.filename }</Text>
          <Text style={{ paddingLeft: 10, paddingRight: 10, paddingBottom: 10, fontSize: 12, fontWeight: "normal", color: "#8C8C8C" }}>{ item.ts }</Text>
        </View>
        <View style={{
          flex: 1,
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <TouchableHighlight
            style={{ padding: 10, }}
            onPress={() => this.setState({modalDelFileVisible: true, file_data_item: item })}
          >
            <Image source={require('../images/xdelete_red.png')} style={{ width: 24, height: 24 }}/>
          </TouchableHighlight>
        </View>
      </View>

    );
  }

  renderAutoFileDataItem = (item_inner) => {

    return (

      <Pressable
        key={item_inner.id}
        onPress={() => this.downloadFile( item_inner )}
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            margin: 5,
            backgroundColor: "#F0F0F0",
            borderRadius: 5,
        }}>
          { item_inner.file_mini != '' ? (
              <Image
                source={{uri: item_inner.file_mini}}
                resizeMode="cover"
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 5
              }}>
              </Image>
            ) : (
              <Text style={{ fontSize: 15, fontWeight: "normal", color: "#2B2D33" }}>{ item_inner.ext }</Text>
            )
          }
        </View>
      </Pressable>
    );
  }

  renderAutoFileItem = (item) => {

    return (

      <View
        key={item.id}
        style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
        <View style={{
          flex: 5,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: "column",
        }}>
          { item.description != '' ? ( <Text style={{ paddingLeft: 10, paddingRight: 10, paddingBottom: 10, fontSize: 20, fontWeight: "bold", color: "#E8E8E8" }}>{ item.description }</Text> ) : null }
          <View style={{
            alignItems: 'flex-start',
            flexDirection: "row",
            flexWrap: "wrap",
          }}>
            {item.file_data.map((item_inner) => this.renderAutoFileDataItem(item_inner))}
          </View>
        </View>
        <View style={{
          flex: 1,
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <TouchableHighlight
            style={{ padding: 10, }}
            onPress={() => this.openModalEditFile( 'edit', item )}
          >
            <Image source={require('../images/edit.png')}/>
          </TouchableHighlight>
        </View>
      </View>

    );
  }

  /* штрафы */
  unpaidFinesSum = () => {
    let sum = 0;
    for (var i = 0; i < this.state.auto_fine_data.unpaid_list.length; i++) { sum += parseInt(this.state.auto_fine_data.unpaid_list[i].sum) }
    return sum
  }

  getAutoFines = (value) => {
    console.log('getAutoFines. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({fines_indicator: true})

      Api.post('/get-auto-fines', { token: value, id : this.state.auto_data.id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({auto_fine_data: data.auto_fine_data, fines_indicator: false})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  renderAutoFinePaidItem = (item) => {

    return (

      <View
        key={item.id}
        style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 8 }}
      >
        <View style={{
          flex: 2,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: "column",
        }}>
          <Image source={require('../images/uil_exclamation-triangle.png')}/>
        </View>
        <View style={{
          flex: 5,
          flexDirection: "column",
          paddingLeft: 10,
        }}>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8"}}>Постановление от {item.dat}</Text>
          </View>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8"}}>Штраф {item.sum}</Text>
          </View>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8", alignItems: 'stretch' }}>{item.description}</Text>
          </View>

        </View>

        <View style={{
          flex: 1,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}>
          <TouchableHighlight
            style={{ paddingTop: 20, paddingLeft: 20, alignItems: 'flex-end', justifyContent: 'flex-end' }}
            onPress={() => {
              console.log('-> move to AutoFine')
              this.props.navigation.navigate('AutoFine', { fine_data: item })
          }}>
            <Image source={require('../images/emojione-v1_right-arrow.png')}/>
          </TouchableHighlight>
        </View>


      </View>
    );
  }

  renderAutoFineUnpaidItem = (item) => {

    console.log('item')
    console.log(item)

    return (

      <View
        key={item.id}
        style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 8 }}
      >
        <View style={{
          flex: 2,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: "column",
        }}>
          <Image source={require('../images/uil_exclamation-triangle.png')}/>
        </View>
        <View style={{
          flex: 5,
          flexDirection: "column",
          paddingLeft: 10,
        }}>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8"}}>Постановление от {item.dat}</Text>
          </View>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8"}}>Штраф {item.sum}</Text>
          </View>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8", alignItems: 'stretch' }}>{item.description}</Text>
          </View>

        </View>

        <View style={{
          flex: 1,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}>
          <TouchableHighlight
            style={{ paddingTop: 20, paddingLeft: 20, alignItems: 'flex-end', justifyContent: 'flex-end' }}
            onPress={() => {
              console.log('-> move to AutoFine')
              this.props.navigation.navigate('AutoFine', { fine_data: item })
          }}>
            <Image source={require('../images/emojione-v1_right-arrow.png')}/>
          </TouchableHighlight>
        </View>

      </View>
    );
  }

  /* ОСАГО */
  getAutoOsago = (value) => {
    console.log('getAutoOsago. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({osago_indicator: true})

      Api.post('/get-auto-osago', { token: value, id : this.state.auto_data.id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({auto_osago_data: data.auto_osago_data, osago_indicator: false})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  /* Диагностическая карта */
  getAutoCheckDiagnosticCard = (value) => {
    console.log('getAutoCheckDiagnosticCard. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({diagnostic_card_indicator: true})

      Api.post('/get-auto-diagnostic-card', { token: value, id : this.state.auto_data.id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({auto_diagnostic_card_data: data.auto_diagnostic_card_data, diagnostic_card_indicator: false})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  /* Пропуска */
  getAutoPasses = (value) => {
    console.log('getAutoPasses. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({passes_indicator: true})

      Api.post('/get-auto-passes', { token: value, id : this.state.auto_data.id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({auto_passes_data: data.auto_passes_data, passes_indicator: false})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  renderAutoPassItem = (item) => {

    return (

      <View
        key={item.id}
        style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 8 }}
      >
        <View style={{
          flex: 2,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: "column",
        }}>
          <Image source={require('../images/truck.png')} style={{ width: 47, height: 36 }}/>
        </View>
        <View style={{
          flex: 5,
          flexDirection: "column",
          paddingLeft: 10,
        }}>

          <View style={{
            flexDirection: "column",
          }}>
            <Text style={{ color: "#E8E8E8"}}>{ item.is_year == 1 ?
                                                'Годовой, ' + item.propusktype + ', ' + item.type_of_pass_string + ', еще ' + item.year_time_left :
                                                'Разовый, еще ' + item.one_time_left }</Text>
            <Text style={{ color: "#E8E8E8"}}>Серия-номер: {item.seriya}</Text>
          </View>

        </View>

      </View>
    );
  }

  componentDidMount() {
    console.log('Auto DidMount')

    AsyncStorage.getItem('token').then((value) => this.getAutoFiles(value));
  }

  render() {
    return (

      <View style={styles.container}>

        <Text style={{ paddingLeft: 20, paddingTop: 20, fontSize: 28, fontWeight: "bold", color: "#E8E8E8" }}>{this.state.auto_data.auto_number}</Text>

        <TouchableHighlight
          style={{ position: 'absolute', top: 20, right: 20, padding: 10, }}
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back.png')} />
        </TouchableHighlight>

        {/* модальное окно подтверждения удаления файла */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalDelFileVisible}
          onRequestClose={() => {
            this.setState({modalDelFileVisible: false})
          }}
        >
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>

            <View style={{
              //flex: 1,
              backgroundColor: '#8C8C8C',
              borderRadius: 25,
              alignItems: 'stretch',
              justifyContent: 'center',
              //marginTop: 70
            }}>

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Удалить файл?</Text>

              <View style={{
                //flex: 1,
                //backgroundColor: 'grey',
                alignItems: 'center',
                justifyContent: 'center',
              }}>

                <View style={{
                  flexDirection: "row",
                  width: 300,
                }}>
                  <View style={{
                    //flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, fontSize: 10, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#FEE600" }}
                      onPress={() =>  {
                        console.log('call del_file')
                        AsyncStorage.getItem('token').then((value) => this.delAutoFile(value));
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#2B2D33" }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, fontSize: 10, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() =>  { this.setState({modalDelFileVisible: false, file_data_item: { id: '', file: '' } }) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#E8E8E8" }}>Отменить</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </View>
            </View>
          </View>
        </Modal>

        {/* модальное окно добавления файла */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalEditFileVisible}
          onRequestClose={() => {
            this.setState({modalEditFileVisible: false})
          }}
        >
          <ScrollView>
            <View style={{
              flex: 1,
              alignItems: 'stretch',
              justifyContent: 'center',
            }}>

              <View style={{
                //flex: 1,
                backgroundColor: '#8C8C8C',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                //marginTop: 70
              }}>

                <View style={{
                  flexDirection: "row",
                }}>
                  <View style={{
                    flex: 5,
                    alignItems: 'flex-start',
                  }}>
                    <Text style={{ paddingLeft: 16, paddingTop: 16, fontSize: 24, fontWeight: "normal", color: "#E8E8E8" }}>Файлы по авто {this.state.auto_data.auto_number}</Text>
                  </View>
                  <View style={{
                    flex: 1,
                    alignItems: 'flex-end',
                  }}>
                    <TouchableHighlight
                      style={{ padding: 30 }}
                      onPress={() => this.closeModalEditFile()}
                    >
                      <Image source={require('../images/xclose.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                <View style={{
                  flexDirection: "column",
                  padding: 10,
                  backgroundColor: "#8C8C8C",
                  borderRadius: 8,
                  borderWidth:1,
                  borderStyle: 'dashed',
                  borderColor:'white',
                  borderTopColor:'white',
                  margin: 16,
                }}>

                  <View style={{
                    flex: 1,
                    flexDirection: "row",
                    paddingBottom: 10
                  }}>
                    <Text style={{ flex: 3, fontSize: 15, color: "#2C2C2C"}}>Комментарий к документам:</Text>
                    <TextInput
                      multiline={true}
                      numberOfLines={2}
                      style={{ borderRadius: 8, textAlignVertical: 'top', flex: 4, fontSize: 15, borderWidth: 1, color: "#E8E8E8", justifyContent: 'flex-start', }}
                      onChangeText={this.changeFileDescription}
                      value={this.state.auto_file_item.description}
                    />
                  </View>

                  <View style={{
                    flex: 1,
                  }}>
                    <Pressable
                      onPress={() => this.pickFile()}
                    >
                      <View style={{
                        flexDirection: "row",
                        padding: 10,
                        backgroundColor: "#4C4C4C",
                        borderRadius: 8,
                        borderWidth:2,
                        borderColor:'#C9A86B',
                        borderTopColor:'#C9A86B'
                      }}>
                        <View style={{
                          flex: 5,
                          flexDirection: "column",
                          alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 15, fontWeight: "bold", color: "#C9A86B"}}>загрузить документы</Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>

                </View>

                <View>
                  {this.state.auto_file_item.file_data.map((item) => this.renderModalEditAutoFileDataItem(item))}
                </View>


              </View>
            </View>
          </ScrollView>
        </Modal>
        {/* */}

        <View style={{height: 130}} >
          <ScrollView
            horizontal={true}
            ref={scrollView => this.scrollView = scrollView}
          >
            <View style={{
              flexDirection: "row",
              padding: 10,
              height: 130,
              paddingRight: 1000,
            }}>

              <Pressable onPress={() => this.checkTab('files')}>
                { this.state.current_tab == 'files' ? (
                  <View style={styles.tab_checked}>
                      <Image source={require('../images/tab_files_checked.png')}/>
                      <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E8E8E8" }}>ФАЙЛЫ</Text>
                  </View>
                  ) : (
                  <View style={styles.tab}>
                      <Image source={require('../images/tab_files.png')}/>
                      <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E8E8E8" }}>ФАЙЛЫ</Text>
                  </View>
                  )
                }
              </Pressable>

              <Pressable onPress={() => this.checkTab('fines')}>
                { this.state.current_tab == 'fines' ? (
                  <View style={styles.tab_checked}>
                    <Image source={require('../images/tab_fines_checked.png')}/>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E8E8E8" }}>ШТРАФЫ</Text>
                  </View>
                  ) : (
                  <View style={styles.tab}>
                    <Image source={require('../images/tab_fines.png')}/>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E8E8E8" }}>ШТРАФЫ</Text>
                  </View>
                  )
                }
              </Pressable>

              <Pressable onPress={() => this.checkTab('osago')}>
                { this.state.current_tab == 'osago' ? (
                  <View style={styles.tab_checked}>
                    <Image source={require('../images/tab_osago_checked.png')}/>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#E8E8E8" }}>ОСАГО</Text>
                  </View>
                  ) : (
                  <View style={styles.tab}>
                    <Image source={require('../images/tab_osago.png')}/>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#E8E8E8" }}>ОСАГО</Text>
                  </View>
                  )
                }
              </Pressable>

              <Pressable onPress={() => this.checkTab('diagnostic_card')}>
                { this.state.current_tab == 'diagnostic_card' ? (
                  <View style={styles.tab_checked}>
                    <Image source={require('../images/tab_diagnostic_card_checked.png')}/>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#E8E8E8" }}>Диагностическая карта</Text>
                  </View>
                  ) : (
                  <View style={styles.tab}>
                    <Image source={require('../images/tab_diagnostic_card.png')}/>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#E8E8E8" }}>Диагностическая карта</Text>
                  </View>
                  )
                }
              </Pressable>

              <Pressable onPress={() => this.checkTab('passes')}>
                { this.state.current_tab == 'passes' ? (
                  <View style={styles.tab_checked}>
                    <Image source={require('../images/tab_passes_checked.png')}/>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E8E8E8" }}>ПРОПУСК</Text>
                  </View>
                  ) : (
                  <View style={styles.tab}>
                    <Image source={require('../images/tab_passes.png')}/>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E8E8E8" }}>ПРОПУСК</Text>
                  </View>
                  )
                }
              </Pressable>
            </View>
          </ScrollView>
        </View>

        { this.state.current_tab == 'files' ? (
            <>
              <ScrollView>
                <View style={{
                  flex: 1,
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  paddingBottom: 80,
                }}>

                  { this.state.files_indicator ? (
                      <ActivityIndicator size="large" color="#C9A86B" animating={true}/>
                    ) : (
                      <>
                        { this.state.auto_file_data.length ? (
                            <View>
                              {this.state.auto_file_data.map((item) => this.renderAutoFileItem(item))}
                            </View>
                          ) : (
                            <Text style={{ paddingLeft: 20, fontSize: 15, color: "#E8E8E8"}}>Добавьте файлы</Text>
                          )
                        }
                      </>
                    )
                  }

                </View>
              </ScrollView>

              <TouchableHighlight
                style={{ position: 'absolute', bottom: 20, right: 20, padding: 10 }}
                onPress={() => this.openModalEditFile( 'add' )}
              >
                <Image source={require('../images/add_button.png')} />
              </TouchableHighlight>

            </>
          ) : null
        }

        { this.state.current_tab == 'fines' ? (
            <ScrollView>
              <View style={{
                flex: 1,
                alignItems: 'stretch',
                justifyContent: 'flex-start',
              }}>

                { this.state.fines_indicator ? (
                    <ActivityIndicator size="large" color="#C9A86B" animating={true}/>
                  ) : (
                    <>
                      <Pressable
                        onPress={() => this.setState({ auto_fine_paid_list_hide: !this.state.auto_fine_paid_list_hide })}
                      >
                        <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
                          <View style={{
                            flex: 5,
                            flexDirection: "column",
                            paddingLeft: 10,
                          }}>
                            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E8E8E8"}}>Оплаченные ранее {this.state.auto_fine_data.paid_list.length ? '(' + this.state.auto_fine_data.paid_list.length + ')' : 'не обнаружены'}</Text>
                          </View>
                        </View>
                      </Pressable>

                      { this.state.auto_fine_paid_list_hide ? (
                          <View>
                            {this.state.auto_fine_data.paid_list.map((item) => this.renderAutoFinePaidItem(item))}
                          </View>
                        ) : null
                      }

                      <Pressable
                        onPress={() => this.setState({ auto_fine_unpaid_list_hide: !this.state.auto_fine_unpaid_list_hide })}
                      >
                        <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
                          <View style={{
                            flex: 5,
                            flexDirection: "column",
                            paddingLeft: 10,
                          }}>
                            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E8E8E8"}}>Штрафы к оплате {this.state.auto_fine_data.unpaid_list.length ? '(' + this.state.auto_fine_data.unpaid_list.length + ')' : 'не обнаружены'}</Text>
                          </View>
                        </View>
                      </Pressable>

                      { this.state.auto_fine_unpaid_list_hide ? (
                          <>
                            <View>
                              {this.state.auto_fine_data.unpaid_list.map((item) => this.renderAutoFineUnpaidItem(item))}
                            </View>

                            { this.state.auto_fine_data.unpaid_list.length ? (
                                <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
                                  <View style={{
                                    flex: 5,
                                    flexDirection: "column",
                                    paddingLeft: 10,
                                  }}>
                                    <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E8E8E8"}}>Всего: {this.unpaidFinesSum()} руб</Text>
                                  </View>
                                </View>
                              ) : null
                            }

                          </>
                        ) : null
                      }



                    </>
                  )
                }

              </View>
            </ScrollView>
          ) : null
        }

        { this.state.current_tab == 'osago' ? (
            <ScrollView>
              <View style={{
                flex: 1,
                alignItems: 'stretch',
                justifyContent: 'flex-start',
              }}>

                { this.state.osago_indicator ? (
                    <ActivityIndicator size="large" color="#C9A86B" animating={true}/>
                  ) : (
                    <View style={{ flexDirection: "column", margin: 20, padding: 10 }}>

                      { typeof(this.state.auto_osago_data.number) == 'undefined' ? (
                          <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Действующие полисы ОСАГО не найдены</Text>
                        ) : (
                          <>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Серия договора {this.state.auto_osago_data.series}</Text>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Номер договора {this.state.auto_osago_data.number}</Text>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Страховая компания {this.state.auto_osago_data.insurer}</Text>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Ограничение лиц, допущенных к управлению транспортным средством: {this.state.auto_osago_data.restrictions == 'WITH RESTRICTIONS' ? 'с ограничениями' : 'без ограничений'}</Text>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Дата окончания действия договора: {this.state.auto_osago_data.date_to}</Text>
                          </>
                        )
                      }

                    </View>
                  )
                }

              </View>
            </ScrollView>
          ) : null
        }

        { this.state.current_tab == 'diagnostic_card' ? (
            <ScrollView>
              <View style={{
                flex: 1,
                alignItems: 'stretch',
                justifyContent: 'flex-start',
              }}>

                { this.state.diagnostic_card_indicator ? (
                    <ActivityIndicator size="large" color="#C9A86B" animating={true}/>
                  ) : (
                    <View style={{ flexDirection: "column", margin: 20, padding: 10 }}>

                      { typeof(this.state.auto_diagnostic_card_data.number) == 'undefined' ? (
                          <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Действующие диагностические карты не найдены</Text>
                        ) : (
                          <>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Номер карты {this.state.auto_diagnostic_card_data.number}</Text>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Место выдачи {this.state.auto_diagnostic_card_data.place}</Text>
                            <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Дата окончания действия: {this.state.auto_diagnostic_card_data.date_to}</Text>
                          </>
                        )
                      }

                    </View>
                  )
                }

              </View>
            </ScrollView>
          ) : null
        }

        { this.state.current_tab == 'passes' ? (
            <>
              <ScrollView>
                <View style={{
                  flex: 1,
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                }}>
                  { this.state.passes_indicator ? (
                      <ActivityIndicator size="large" color="#C9A86B" animating={true}/>
                    ) : (
                      <>
                        <View>
                          {this.state.auto_passes_data.map((item) => this.renderAutoPassItem(item))}
                        </View>
                      </>
                    )
                  }
                </View>
              </ScrollView>
              <TouchableHighlight
                style={{ position: 'absolute', left: 10, bottom: 10, right: 10, height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#C9A86B" }}
                onPress={() => {
                  console.log('-> move to Pass')
                  this.props.navigation.navigate('Pass', { auto_list: [ this.state.auto_data ] })
                }}>
                <Text style={{ fontSize: 24, color: "#E8E8E8" }}>Заказать пропуск</Text>
              </TouchableHighlight>
            </>
          ) : null
        }


      </View>
    );
  }

}

// ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
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

export default Auto;
