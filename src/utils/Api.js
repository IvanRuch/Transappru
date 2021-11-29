// utils/Api.js

import axios from "axios";

export default axios.create({
  //baseURL: "https://ivan.trans-konsalt.ru/api/",
  baseURL: "https://transapp.ru/api/",
  responseType: "json"
});
